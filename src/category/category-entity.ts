import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Song } from '../song/song.entity';
import { CategoryStatistics } from './category-statistics.entity';

export enum CategoryType {
  GENRE = 'genre',
  DECADE = 'decade',
  CUSTOM = 'custom',
}

@Entity()
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
    default: CategoryType.CUSTOM,
  })
  type: CategoryType;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({ nullable: true, type: 'jsonb' })
  metadata: Record<string, any>;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @ManyToMany(() => Song, song => song.categories)
  @JoinTable()
  songs: Song[];

  @OneToMany(() => CategoryStatistics, stats => stats.category)
  statistics: CategoryStatistics[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  addTag(tag: string): void {
    if (!this.tags) {
      this.tags = [];
    }
    
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (!this.tags) {
      return;
    }
    
    this.tags = this.tags.filter(t => t !== tag);
  }
}