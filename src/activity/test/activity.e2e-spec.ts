import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import * as request from 'supertest';
import { ActivityModule } from '../activity.module';
import { ActivityType, ContentType } from '../schemas/activity.schema';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

// Mock JwtAuthGuard to allow testing without actual JWT
class MockJwtAuthGuard {
  canActivate() {
    return true;
  }
}

describe('ActivityController (e2e)', () => {
  let app: INestApplication;
  const mockUserId = '60d21b4667d0d8992e610c85';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Use an in-memory MongoDB for testing
        MongooseModule.forRoot('mongodb://localhost/test-db', {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }),
        ActivityModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .overrideProvider(CurrentUser)
      .useValue(() => mockUserId)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/activity (POST) - should create a new activity', () => {
    return request(app.getHttpServer())
      .post('/activity')
      .send({
        contentId: '60d21b4667d0d8992e610c86',
        activityType: ActivityType.COMMENT,
        contentType: ContentType.POST,
        metadata: { text: 'Great post!' }
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.activityType).toBe(ActivityType.COMMENT);
      });
  });

  // Add more e2e tests for other endpoints
});
