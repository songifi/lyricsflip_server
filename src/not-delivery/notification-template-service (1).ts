import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationTemplateRepository } from './notification-template.repository';
import { NotificationTemplate } from './notification-template.entity';
import { NotificationTemplateDto } from './notification.dto';
import { NotificationType, NotificationChannel } from './notification.entity';
import * as Handlebars from 'handlebars';

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);
  private readonly compiledTemplates = new Map<string, Handlebars.TemplateDelegate>();

  constructor(
    @InjectRepository(NotificationTemplateRepository)
    private readonly templateRepository: NotificationTemplateRepository
  ) {
    // Initialize templates cache
    this.initializeTemplatesCache();
  }

  /**
   * Initialize templates cache
   */
  private async initializeTemplatesCache(): Promise<void> {
    try {
      // Ensure default templates exist
      await this.templateRepository.createDefaultTemplates();
      
      // Load all active templates
      const templates = await this.templateRepository.findAllActive();
      
      // Precompile templates for better performance
      for (const template of templates) {
        const key = this.getTemplateKey(template.type, template.channel);
        this.compiledTemplates.set(
          `${key}_title`, 
          Handlebars.compile(template.titleTemplate)
        );
        this.compiledTemplates.set(
          `${key}_body`, 
          Handlebars.compile(template.bodyTemplate)
        );
      }
      
      this.logger.log(`Initialized ${this.compiledTemplates.size} compiled templates`);
    } catch (error) {
      this.logger.error(`Error initializing templates cache: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Get template by type and channel
   */
  async getTemplate(
    type: NotificationType,
    channel: NotificationChannel = NotificationChannel.IN_APP
  ): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findByTypeAndChannel(type, channel);
    
    if (!template) {
      throw new NotFoundException(`Template for type ${type} and channel ${channel} not found`);
    }
    
    return template;
  }
  
  /**
   * Create a new template
   */
  async createTemplate(dto: NotificationTemplateDto): Promise<NotificationTemplate> {
    const template = this.templateRepository.create({
      ...dto
    });
    
    const savedTemplate = await this.templateRepository.save(template);
    
    // Update template cache
    const key = this.getTemplateKey(savedTemplate.type, savedTemplate.channel);
    this.compiledTemplates.set(
      `${key}_title`, 
      Handlebars.compile(savedTemplate.titleTemplate)
    );
    this.compiledTemplates.set(
      `${key}_body`, 
      Handlebars.compile(savedTemplate.bodyTemplate)
    );
    
    return savedTemplate;
  }
  
  /**
   * Update a template
   */
  async updateTemplate(
    id: string,
    dto: Partial<NotificationTemplateDto>
  ): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne(id);
    
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    
    Object.assign(template, dto);
    const updatedTemplate = await this.templateRepository.save(template);
    
    // Update template cache
    const key = this.getTemplateKey(updatedTemplate.type, updatedTemplate.channel);
    this.compiledTemplates.set(
      `${key}_title`, 
      Handlebars.compile(updatedTemplate.titleTemplate)
    );
    this.compiledTemplates.set(
      `${key}_body`, 
      Handlebars.compile(updatedTemplate.bodyTemplate)
    );
    
    return updatedTemplate;
  }
  
  /**
   * Render a notification using a template and variables
   */
  async renderNotification(
    type: NotificationType,
    variables: Record<string, any>,
    channel: NotificationChannel = NotificationChannel.IN_APP
  ): Promise<{
    title: string;
    body: string;
    data?: any;
  }> {
    try {
      const key = this.getTemplateKey(type, channel);
      
      // Get compiled templates from cache or compile on demand
      let titleTemplate = this.compiledTemplates.get(`${key}_title`);
      let bodyTemplate = this.compiledTemplates.get(`${key}_body`);
      
      // If templates are not cached, get them from the database
      if (!titleTemplate || !bodyTemplate) {
        const template = await this.getTemplate(type, channel);
        
        titleTemplate = Handlebars.compile(template.titleTemplate);
        bodyTemplate = Handlebars.compile(template.bodyTemplate);
        
        // Cache for future use
        this.compiledTemplates.set(`${key}_title`, titleTemplate);
        this.compiledTemplates.set(`${key}_body`, bodyTemplate);
        
        // Also compile and render data template if available
        if (template.dataTemplate) {
          const renderedData = this.renderDataTemplate(template.dataTemplate, variables);
          return {
            title: titleTemplate(variables),
            body: bodyTemplate(variables),
            data: renderedData
          };
        }
      }
      
      // Render templates with variables
      return {
        title: titleTemplate(variables),
        body: bodyTemplate(variables)
      };
    } catch (error) {
      this.logger.error(`Error rendering notification: ${error.message}`, error.stack);
      
      // Fallback to basic rendering
      return {
        title: variables.title || type,
        body: variables.body || JSON.stringify(variables)
      };
    }
  }
  
  /**
   * Render a data template
   */
  private renderDataTemplate(
    dataTemplate: any,
    variables: Record<string, any>
  ): any {
    // If dataTemplate is an object, process each key
    if (typeof dataTemplate === 'object' && dataTemplate !== null) {
      const result = {};
      
      for (const [key, value] of Object.entries(dataTemplate)) {
        if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
          // This is a template string, compile and render it
          const template = Handlebars.compile(value);
          result[key] = template(variables);
        } else if (typeof value === 'object' && value !== null) {
          // Recursively process nested objects
          result[key] = this.renderDataTemplate(value, variables);
        } else {
          // Just copy other values
          result[key] = value;
        }
      }
      
      return result;
    }
    
    // For non-objects, just return as is
    return dataTemplate;
  }
  
  /**
   * Get a unique key for a template based on type and channel
   */
  private getTemplateKey(type: NotificationType, channel: NotificationChannel): string {
    return `${type}_${channel}`;
  }
}
