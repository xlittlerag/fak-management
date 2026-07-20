import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { UploadsController } from './uploads.controller';

@Module({
  controllers: [UploadsController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
