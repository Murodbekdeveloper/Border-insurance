import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

// Postgres unique_violation on one of the vehicles identifier columns —
// mapped to a friendly, field-specific message instead of a raw 500.
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  UQ_vehicle_plate_number:
    'Bu davlat raqami bilan transport vositasi allaqachon ro\'yxatdan o\'tgan',
  UQ_vehicle_body_number:
    'Bu kuzov raqami bilan transport vositasi allaqachon ro\'yxatdan o\'tgan',
  UQ_vehicle_engine_number:
    'Bu dvigatel raqami bilan transport vositasi allaqachon ro\'yxatdan o\'tgan',
};

function uniqueConstraintMessage(err: unknown): string | null {
  const code = (err as { code?: string; driverError?: { code?: string } })
    ?.code ?? (err as { driverError?: { code?: string } })?.driverError?.code;
  const constraint =
    (err as { constraint?: string; driverError?: { constraint?: string } })
      ?.constraint ??
    (err as { driverError?: { constraint?: string } })?.driverError
      ?.constraint;
  if (code !== '23505' || !constraint) return null;
  return UNIQUE_CONSTRAINT_MESSAGES[constraint] ?? null;
}

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
  ) {}

  async create(userId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehiclesRepository.create({ ...dto, userId });
    try {
      return await this.vehiclesRepository.save(vehicle);
    } catch (err) {
      const message = uniqueConstraintMessage(err);
      if (message) {
        throw new ConflictException(message);
      }
      throw err;
    }
  }

  findAllForUser(userId: string): Promise<Vehicle[]> {
    return this.vehiclesRepository.find({ where: { userId } });
  }

  async findById(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Transport vositasi topilmadi');
    }
    return vehicle;
  }
}
