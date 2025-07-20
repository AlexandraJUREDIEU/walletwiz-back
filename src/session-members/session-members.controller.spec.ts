import { Test, TestingModule } from '@nestjs/testing';
import { SessionMembersController } from './session-members.controller';
import { SessionMembersService } from './session-members.service';

describe('SessionMembersController', () => {
  let controller: SessionMembersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionMembersController],
      providers: [SessionMembersService],
    }).compile();

    controller = module.get<SessionMembersController>(SessionMembersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
