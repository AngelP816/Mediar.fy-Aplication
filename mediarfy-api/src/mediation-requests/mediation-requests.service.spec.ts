import { Test, TestingModule } from '@nestjs/testing';
import { MediationRequestsService } from './mediation-requests.service';

describe('MediationRequestsService', () => {
  let service: MediationRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediationRequestsService],
    }).compile();

    service = module.get<MediationRequestsService>(MediationRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
