import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Category } from './category.entity';

@Entity()
export class CategoryStatistics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Category, category => category.statistics)
  category: Category;

  @Column({ default: 0 })
  songCount: number;

  @Column({ default: 0 })
  totalListens: number;

  @Column({ default: 0 })
  totalLikes: number;

  @Column({ type: 'jsonb', nullable: true })
  demographicData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  timeSeriesData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}