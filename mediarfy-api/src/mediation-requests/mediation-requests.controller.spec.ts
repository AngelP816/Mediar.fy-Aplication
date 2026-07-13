import { Test, TestingModule } from '@nestjs/testing';
import { MediationRequestsController } from './mediation-requests.controller';

describe('MediationRequestsController', () => {
  let controller: MediationRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediationRequestsController],
    }).compile();

    controller = module.get<MediationRequestsController>(MediationRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
