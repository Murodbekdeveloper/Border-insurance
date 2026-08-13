import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { ExtractDocumentDto } from './dto/extract-document.dto';

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('extract')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      "Hujjat rasmidan (texpasport/guvohnoma) ma'lumotlarni OCR orqali aniqlash",
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  extract(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ExtractDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('Rasm fayli yuborilmagan');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Faqat JPG yoki PNG rasm qabul qilinadi');
    }
    return this.documentsService.extract(file, dto.documentType);
  }
}
