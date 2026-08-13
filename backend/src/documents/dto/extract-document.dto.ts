import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { DOCUMENT_TYPES } from '../document-type';
import type { DocumentType } from '../document-type';

export class ExtractDocumentDto {
  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES)
  documentType: DocumentType;
}
