import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Card, CardType } from './entities/card.entity';
import { CreateCardDto } from './dto/create-card.dto';
import { PaymeClientService } from '../payme/payme-client.service';
import { PaymeApiError } from '../payme/payme-api.error';
import type {
  CardsCreateParams,
  CardsCreateResult,
  CardsGetVerifyCodeParams,
  CardsGetVerifyCodeResult,
  CardsVerifyParams,
  CardsVerifyResult,
} from '../payme/payme.types';

// Mastercard also issues in the 2221-2720 BIN range (since 2017), in
// addition to the classic 51-55 range. Uzcard/Humo are the dominant local
// card networks in Uzbekistan — most customers' real cards are one of
// these two, not Visa/Mastercard.
function isMastercard2Series(cardNumber: string): boolean {
  const prefix = Number(cardNumber.slice(0, 4));
  return prefix >= 2221 && prefix <= 2720;
}

// Domestic Uzbek BINs, checked before the international ranges below.
// 8600/6262 are plain Uzcard; 5614 is the "UzCard-Mastercard" cobadge BIN —
// the same 16 digits work as Mastercard abroad and as Uzcard (no CVV,
// domestic-only) at home, and 5614 also falls inside Mastercard's classic
// 51-55 range. For this app (domestic OSAGO payments) that card is an
// Uzcard, so the Uzcard/Humo check must win over the generic range check.
const UZCARD_PREFIXES = ['8600', '5614', '6262'];
const HUMO_PREFIXES = ['9860'];

function detectCardType(cardNumber: string): CardType | null {
  if (UZCARD_PREFIXES.some((p) => cardNumber.startsWith(p)))
    return CardType.UZCARD;
  if (HUMO_PREFIXES.some((p) => cardNumber.startsWith(p)))
    return CardType.HUMO;

  if (cardNumber.startsWith('4')) return CardType.VISA;
  const prefix2 = Number(cardNumber.slice(0, 2));
  if (prefix2 >= 51 && prefix2 <= 55) return CardType.MASTERCARD;
  if (isMastercard2Series(cardNumber)) return CardType.MASTERCARD;
  return null;
}

// Payme expects MM/YY as YYMM (e.g. "12/30" -> "3012").
function toPaymeExpire(expDate: string): string {
  const [month, year] = expDate.split('/');
  return `${year}${month}`;
}

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    private readonly configService: ConfigService,
    private readonly paymeClient: PaymeClientService,
  ) {}

  private get paymeEnabled(): boolean {
    return this.configService.get<string>('payments.provider') === 'payme';
  }

  async create(userId: string, dto: CreateCardDto): Promise<Card> {
    const cardType = detectCardType(dto.cardNumber);
    if (!cardType) {
      throw new BadRequestException(
        'Karta raqami noto’g’ri — Visa, Mastercard, Uzcard yoki Humo kartasini kiriting',
      );
    }

    // Uzcard/Humo cards have no CVV printed on them — only Visa/Mastercard
    // require one.
    const cvvRequired =
      cardType === CardType.VISA || cardType === CardType.MASTERCARD;
    if (cvvRequired && !dto.cvv) {
      throw new BadRequestException('CVV kodini kiriting');
    }

    let paymeToken: string | null = null;
    let paymeVerified = false;
    if (this.paymeEnabled) {
      const tokenized = await this.paymeClient.call<
        CardsCreateParams,
        CardsCreateResult
      >('cards.create', {
        card: { number: dto.cardNumber, expire: toPaymeExpire(dto.expDate) },
        save: true,
      });
      paymeToken = tokenized.card.token;
      paymeVerified = tokenized.card.verify;
    }

    // Only the last 4 digits and card type are persisted — the full PAN and
    // CVV are never written to storage (PCI-DSS scope reduction). Once
    // Payme is active, its token is what gets charged, not this row.
    const card = this.cardsRepository.create({
      userId,
      cardType,
      maskedNumber: dto.cardNumber.slice(-4),
      cardHolderName: dto.cardHolderName,
      expDate: dto.expDate,
      paymeToken,
      paymeVerified,
    });
    return this.cardsRepository.save(card);
  }

  async requestPaymeVerification(id: string, userId: string): Promise<void> {
    const card = await this.findById(id, userId);
    if (!card.paymeToken) {
      throw new BadRequestException('Karta Payme orqali ro‘yxatdan o‘tmagan');
    }
    await this.paymeClient.call<
      CardsGetVerifyCodeParams,
      CardsGetVerifyCodeResult
    >('cards.get_verify_code', { token: card.paymeToken });
  }

  async confirmPaymeVerification(
    id: string,
    userId: string,
    code: string,
  ): Promise<Card> {
    const card = await this.findById(id, userId);
    if (!card.paymeToken) {
      throw new BadRequestException('Karta Payme orqali ro‘yxatdan o‘tmagan');
    }
    try {
      const verified = await this.paymeClient.call<
        CardsVerifyParams,
        CardsVerifyResult
      >('cards.verify', { token: card.paymeToken, code });
      card.paymeVerified = verified.card.verify;
    } catch (err) {
      if (err instanceof PaymeApiError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
    return this.cardsRepository.save(card);
  }

  findAllForUser(userId: string): Promise<Card[]> {
    return this.cardsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, userId: string): Promise<Card> {
    const card = await this.cardsRepository.findOne({
      where: { id, userId },
    });
    if (!card) {
      throw new NotFoundException('Karta topilmadi');
    }
    return card;
  }

  async remove(id: string, userId: string): Promise<void> {
    const card = await this.findById(id, userId);
    await this.cardsRepository.remove(card);
  }
}
