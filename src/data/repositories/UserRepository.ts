
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from '@/services/BaseService';
import { UserProfile } from '@/types/auth';

export class UserRepository extends BaseService {
  private static instance: UserRepository;

  private constructor() {
    super();
  }

  public static getInstance(): UserRepository {
    if (!UserRepository.instance) {
      UserRepository.instance = new UserRepository();
    }
    return UserRepository.instance;
  }

  async getUserProfile(userId: string): Promise<ServiceResult<UserProfile | null>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No rows returned - user profile doesn't exist
            return null;
          }
          throw error;
        }
        
        return data;
      },
      'getUserProfile'
    );
  }

  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<ServiceResult<UserProfile>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .update({
            ...profileData,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      'updateUserProfile'
    );
  }

  async createUserProfile(profileData: UserProfile): Promise<ServiceResult<UserProfile>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .insert({
            ...profileData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      'createUserProfile'
    );
  }
}

export const userRepository = UserRepository.getInstance();
