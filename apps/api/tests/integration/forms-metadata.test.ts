import request from 'supertest';
import { app } from '../../src/server';
import { databaseService } from '../../src/services/database.service';
import { FormStatus, FormFieldType } from '@nodeangularfullstack/shared';

/**
 * Integration tests for field-specific metadata persistence (Story 16.4).
 * Tests HEADING, IMAGE, and TEXT_BLOCK metadata saves and retrieves correctly.
 */
describe('Forms Metadata Persistence (Story 16.4)', () => {
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    // Register test user
    const userRegistrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'metadatauser@example.com',
        password: 'TestPass123!',
        firstName: 'Metadata',
        lastName: 'User',
      });

    userId = userRegistrationResponse.body.data.user.id;

    // Login to get valid JWT token
    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'metadatauser@example.com',
        password: 'TestPass123!',
      });

    userToken = userLoginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    const client = await databaseService.getPool().connect();
    try {
      await client.query(
        'DELETE FROM form_schemas WHERE form_id IN (SELECT id FROM forms WHERE user_id = $1)',
        [userId]
      );
      await client.query('DELETE FROM forms WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM sessions');
      await client.query("DELETE FROM users WHERE email LIKE '%metadatauser%'");
    } finally {
      client.release();
    }

    await databaseService.close();
  });

  beforeEach(async () => {
    // Clean up forms before each test
    const client = await databaseService.getPool().connect();
    try {
      await client.query(
        'DELETE FROM form_schemas WHERE form_id IN (SELECT id FROM forms WHERE user_id = $1)',
        [userId]
      );
      await client.query('DELETE FROM forms WHERE user_id = $1', [userId]);
    } finally {
      client.release();
    }
  });

  describe('HEADING Field Metadata Persistence', () => {
    it('should save HEADING field metadata correctly', async () => {
      // Arrange
      const formData = {
        title: 'Heading Metadata Test',
        description: 'Test HEADING metadata persistence',
        status: FormStatus.DRAFT,
        schema_json: {
          fields: [
            {
              id: 'field-heading-1',
              type: FormFieldType.HEADING,
              label: 'Welcome Title',
              required: false,
              order: 0,
              metadata: {
                headingLevel: 'h1',
                alignment: 'center',
                color: '#FF0000',
                fontWeight: 'bold',
              },
            },
          ],
        },
      };

      // Act - Create form
      const createResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send(formData);

      // Assert - Create response
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      const formId = createResponse.body.data.id;

      // Act - Retrieve form
      const getResponse = await request(app)
        .get(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert - Metadata persisted correctly
      expect(getResponse.status).toBe(200);
      const field = getResponse.body.data.schema_json.fields[0];
      expect(field.metadata.headingLevel).toBe('h1');
      expect(field.metadata.alignment).toBe('center');
      expect(field.metadata.color).toBe('#FF0000');
      expect(field.metadata.fontWeight).toBe('bold');
    });

    it('should update HEADING field metadata', async () => {
      // Arrange - Create form
      const formResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'HEADING Update Test',
          schema_json: {
            fields: [
              {
                id: 'field-1',
                type: FormFieldType.HEADING,
                label: 'Title',
                required: false,
                order: 0,
                metadata: {
                  headingLevel: 'h2',
                  alignment: 'left',
                  fontWeight: 'normal',
                },
              },
            ],
          },
        });

      const formId = formResponse.body.data.id;

      // Act - Update metadata
      const updateResponse = await request(app)
        .put(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          schema_json: {
            fields: [
              {
                id: 'field-1',
                type: FormFieldType.HEADING,
                label: 'Title',
                required: false,
                order: 0,
                metadata: {
                  headingLevel: 'h3',
                  alignment: 'right',
                  color: '#0000FF',
                  fontWeight: 'bold',
                },
              },
            ],
          },
        });

      // Assert
      expect(updateResponse.status).toBe(200);
      const updatedField = updateResponse.body.data.schema_json.fields[0];
      expect(updatedField.metadata.headingLevel).toBe('h3');
      expect(updatedField.metadata.alignment).toBe('right');
      expect(updatedField.metadata.color).toBe('#0000FF');
      expect(updatedField.metadata.fontWeight).toBe('bold');
    });

    it('should preserve customStyle in HEADING metadata', async () => {
      // Arrange
      const formData = {
        title: 'HEADING Custom Style Test',
        schema_json: {
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.HEADING,
              label: 'Title',
              required: false,
              order: 0,
              metadata: {
                headingLevel: 'h2',
                alignment: 'left',
                fontWeight: 'bold',
                customStyle:
                  'letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);',
              },
            },
          ],
        },
      };

      // Act
      const createResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send(formData);

      const formId = createResponse.body.data.id;
      const getResponse = await request(app)
        .get(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      expect(getResponse.status).toBe(200);
      const field = getResponse.body.data.schema_json.fields[0];
      expect(field.metadata.customStyle).toBe(
        'letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);'
      );
    });
  });

  describe('IMAGE Field Metadata Persistence', () => {
    it('should save IMAGE field metadata correctly', async () => {
      // Arrange
      const formData = {
        title: 'Image Metadata Test',
        description: 'Test IMAGE metadata persistence',
        status: FormStatus.DRAFT,
        schema_json: {
          fields: [
            {
              id: 'field-image-1',
              type: FormFieldType.IMAGE,
              label: 'Profile Picture',
              required: false,
              order: 0,
              metadata: {
                imageUrl: 'https://cdn.example.com/image.jpg',
                altText: 'User profile picture',
                width: '500px',
                height: '300px',
                alignment: 'center',
                objectFit: 'cover',
                caption: 'My profile photo',
              },
            },
          ],
        },
      };

      // Act - Create form
      const createResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send(formData);

      // Assert
      expect(createResponse.status).toBe(201);

      const formId = createResponse.body.data.id;

      // Act - Retrieve form
      const getResponse = await request(app)
        .get(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert - Metadata persisted correctly
      expect(getResponse.status).toBe(200);
      const field = getResponse.body.data.schema_json.fields[0];
      expect(field.metadata.imageUrl).toBe('https://cdn.example.com/image.jpg');
      expect(field.metadata.altText).toBe('User profile picture');
      expect(field.metadata.width).toBe('500px');
      expect(field.metadata.height).toBe('300px');
      expect(field.metadata.alignment).toBe('center');
      expect(field.metadata.objectFit).toBe('cover');
      expect(field.metadata.caption).toBe('My profile photo');
    });

    it('should update IMAGE field metadata', async () => {
      // Arrange - Create form
      const formResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'IMAGE Update Test',
          schema_json: {
            fields: [
              {
                id: 'field-1',
                type: FormFieldType.IMAGE,
                label: 'Image',
                required: false,
                order: 0,
                metadata: {
                  altText: 'Original alt text',
                  alignment: 'left',
                },
              },
            ],
          },
        });

      const formId = formResponse.body.data.id;

      // Act - Update metadata
      const updateResponse = await request(app)
        .put(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          schema_json: {
            fields: [
              {
                id: 'field-1',
                type: FormFieldType.IMAGE,
                label: 'Image',
                required: false,
                order: 0,
                metadata: {
                  imageUrl: 'https://cdn.example.com/new-image.jpg',
                  altText: 'Updated alt text',
                  width: '100%',
                  height: 'auto',
                  alignment: 'full',
                  objectFit: 'contain',
                },
              },
            ],
          },
        });

      // Assert
      expect(updateResponse.status).toBe(200);
      const updatedField = updateResponse.body.data.schema_json.fields[0];
      expect(updatedField.metadata.imageUrl).toBe(
        'https://cdn.example.com/new-image.jpg'
      );
      expect(updatedField.metadata.altText).toBe('Updated alt text');
      expect(updatedField.metadata.alignment).toBe('full');
      expect(updatedField.metadata.objectFit).toBe('contain');
    });

    it('should require altText for IMAGE field', async () => {
      // Arrange
      const formData = {
        title: 'IMAGE Missing Alt Text',
        schema_json: {
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.IMAGE,
              label: 'Image',
              required: false,
              order: 0,
              metadata: {
                imageUrl: 'https://cdn.example.com/image.jpg',
                // Missing altText (required for accessibility)
              },
            },
          ],
        },
      };

      // Act
      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send(formData);

      // Assert - Should fail validation
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCHEMA_VALIDATION_ERROR');
    });
  });

  describe('TEXT_BLOCK Field Metadata Persistence', () => {
    it('should save TEXT_BLOCK field metadata correctly', async () => {
      // Arrange
      const formData = {
        title: 'Text Block Metadata Test',
        description: 'Test TEXT_BLOCK metadata persistence',
        status: FormStatus.DRAFT,
        schema_json: {
          fields: [
            {
              id: 'field-text-1',
              type: FormFieldType.TEXT_BLOCK,
              label: 'Instructions',
              required: false,
              order: 0,
              metadata: {
                content:
                  '<p>Please complete all fields with <strong>accurate</strong> information.</p>',
                alignment: 'justify',
                backgroundColor: '#F0F0F0',
                padding: 'large',
                collapsible: true,
                collapsed: false,
              },
            },
          ],
        },
      };

      // Act - Create form
      const createResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send(formData);

      // Assert
      expect(createResponse.status).toBe(201);

      const formId = createResponse.body.data.id;

      // Act - Retrieve form
      const getResponse = await request(app)
        .get(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert - Metadata persisted correctly
      expect(getResponse.status).toBe(200);
      const field = getResponse.body.data.schema_json.fields[0];
      expect(field.metadata.content).toContain('<p>Please complete all fields');
      expect(field.metadata.alignment).toBe('justify');
      expect(field.metadata.backgroundColor).toBe('#F0F0F0');
      expect(field.metadata.padding).toBe('large');
      expect(field.metadata.collapsible).toBe(true);
      expect(field.metadata.collapsed).toBe(false);
    });

    it('should sanitize HTML in TEXT_BLOCK content', async () => {
      // Arrange
      const formData = {
        title: 'TEXT_BLOCK HTML Sanitization',
        schema_json: {
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.TEXT_BLOCK,
              label: 'Instructions',
              required: false,
              order: 0,
              metadata: {
                content: '<p>Safe content</p><script>alert("xss")</script>',
                alignment: 'left',
              },
            },
          ],
        },
      };

      // Act
      const createResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send(formData);

      // Assert - Should sanitize and remove script tags
      expect(createResponse.status).toBe(201);
      const field = createResponse.body.data.schema_json.fields[0];
      expect(field.metadata.content).toContain('<p>Safe content</p>');
      expect(field.metadata.content).not.toContain('<script>');
    });

    it('should update TEXT_BLOCK field metadata', async () => {
      // Arrange - Create form
      const formResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'TEXT_BLOCK Update Test',
          schema_json: {
            fields: [
              {
                id: 'field-1',
                type: FormFieldType.TEXT_BLOCK,
                label: 'Instructions',
                required: false,
                order: 0,
                metadata: {
                  content: '<p>Original content</p>',
                  alignment: 'left',
                  padding: 'medium',
                },
              },
            ],
          },
        });

      const formId = formResponse.body.data.id;

      // Act - Update metadata
      const updateResponse = await request(app)
        .put(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          schema_json: {
            fields: [
              {
                id: 'field-1',
                type: FormFieldType.TEXT_BLOCK,
                label: 'Instructions',
                required: false,
                order: 0,
                metadata: {
                  content: '<p>Updated content with <em>emphasis</em></p>',
                  alignment: 'center',
                  backgroundColor: '#E8F4F8',
                  padding: 'small',
                  collapsible: true,
                  collapsed: true,
                },
              },
            ],
          },
        });

      // Assert
      expect(updateResponse.status).toBe(200);
      const updatedField = updateResponse.body.data.schema_json.fields[0];
      expect(updatedField.metadata.content).toContain('Updated content');
      expect(updatedField.metadata.alignment).toBe('center');
      expect(updatedField.metadata.backgroundColor).toBe('#E8F4F8');
      expect(updatedField.metadata.padding).toBe('small');
      expect(updatedField.metadata.collapsible).toBe(true);
      expect(updatedField.metadata.collapsed).toBe(true);
    });
  });

  describe('Multiple Field Types Metadata Persistence', () => {
    it('should save metadata for multiple field types in single form', async () => {
      // Arrange
      const formData = {
        title: 'Mixed Fields Metadata Test',
        schema_json: {
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.HEADING,
              label: 'Form Title',
              required: false,
              order: 0,
              metadata: {
                headingLevel: 'h1',
                alignment: 'center',
                color: '#333333',
                fontWeight: 'bold',
              },
            },
            {
              id: 'field-2',
              type: FormFieldType.TEXT_BLOCK,
              label: 'Instructions',
              required: false,
              order: 1,
              metadata: {
                content: '<p>Please fill out the form below.</p>',
                alignment: 'left',
                padding: 'medium',
              },
            },
            {
              id: 'field-3',
              type: FormFieldType.IMAGE,
              label: 'Logo',
              required: false,
              order: 2,
              metadata: {
                imageUrl: 'https://cdn.example.com/logo.png',
                altText: 'Company logo',
                alignment: 'center',
                width: '200px',
                height: 'auto',
                objectFit: 'contain',
              },
            },
          ],
        },
      };

      // Act
      const createResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send(formData);

      expect(createResponse.status).toBe(201);

      const formId = createResponse.body.data.id;
      const getResponse = await request(app)
        .get(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert - All metadata persisted
      expect(getResponse.status).toBe(200);
      const fields = getResponse.body.data.schema_json.fields;

      // HEADING field
      expect(fields[0].metadata.headingLevel).toBe('h1');
      expect(fields[0].metadata.alignment).toBe('center');

      // TEXT_BLOCK field
      expect(fields[1].metadata.content).toContain('Please fill out the form');
      expect(fields[1].metadata.padding).toBe('medium');

      // IMAGE field
      expect(fields[2].metadata.imageUrl).toBe(
        'https://cdn.example.com/logo.png'
      );
      expect(fields[2].metadata.altText).toBe('Company logo');
      expect(fields[2].metadata.objectFit).toBe('contain');
    });
  });
});
