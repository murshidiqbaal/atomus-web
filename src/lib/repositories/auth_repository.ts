import { supabase } from "../supabase";
import { AuthCredentials } from "../types";
import { generateSecurePassword } from "../utils/password_utils";

export interface IAuthRepository {
  createAccount(email: string, password?: string): Promise<AuthCredentials>;
  resetPassword(email: string): Promise<string>;
  sendCredentials(email: string, password: string): Promise<{ success: boolean; message: string }>;
}

export class SupabaseAuthRepository implements IAuthRepository {
  async createAccount(email: string, password?: string): Promise<AuthCredentials> {
    const generatedPassword = password || generateSecurePassword();

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password: generatedPassword,
      options: {
        data: {
          role: 'parent',
        }
      }
    });

    if (error) throw error;

    return { email, password: generatedPassword };
  }

  async resetPassword(email: string): Promise<string> {
    // In Supabase, this sends a reset link, it doesn't return a new password string
    // But for this UI, we might want to manually generate one if the admin resets it
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return "Reset link sent";
  }

  async sendCredentials(email: string, password: string): Promise<{ success: boolean; message: string }> {
    /**
     * NOTE: To send plain text passwords via email in Supabase, 
     * you should use a Supabase Edge Function with a service like Resend or SendGrid.
     * 
     * Example Edge Function call:
     * await supabase.functions.invoke('send-parent-credentials', {
     *   body: { email, password }
     * });
     */

    // For now, we simulate the success of the invitation/signup process
    return {
      success: true,
      message: `Account created. Supabase has sent a confirmation email to ${email}.`
    };
  }
}

export const authRepository = new SupabaseAuthRepository();
