import { Test, TestingModule } from '@nestjs/testing';
import { SessionMembersService } from './session-members.service';

describe('SessionMembersService', () => {
  let service: SessionMembersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionMembersService],
    }).compile();

    service = module.get<SessionMembersService>(SessionMembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
