import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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
const MAX_FILES = 2;
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
      "Hujjat rasmi(lari)dan (texpasport/guvohnoma, old/orqa tomon) ma'lumotlarni OCR orqali aniqlash",
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  extract(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body() dto: ExtractDocumentDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Rasm fayli yuborilmagan');
    }
    if (files.some((file) => !ALLOWED_MIME_TYPES.includes(file.mimetype))) {
      throw new BadRequestException('Faqat JPG yoki PNG rasm qabul qilinadi');
    }
    return this.documentsService.extract(files, dto.documentType);
  }
}
