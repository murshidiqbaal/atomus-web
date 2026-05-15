import { supabase } from "../supabase";
import { AuthCredentials } from "../types";
import { generateSecurePassword } from "../utils/password_utils";

export interface IAuthRepository {
  createParentAccount(email: string, phone: string, password: string, fullName: string): Promise<AuthCredentials>;
  resetPassword(email: string): Promise<string>;
  sendCredentials(email: string, phone: string, password: string, studentName: string): Promise<{ success: boolean; message: string }>;
}

export class SupabaseAuthRepository implements IAuthRepository {
  /**
   * Creates a parent auth account. Uses email for Supabase Auth (required),
   * phone is stored as username for Flutter app login.
   */
  async createParentAccount(
    email: string,
    phone: string,
    password: string,
    fullName: string
  ): Promise<AuthCredentials> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phone,
          role: 'parent',
        },
      },
    });

    if (error) throw error;
    return { email, password };
  }

  async resetPassword(email: string): Promise<string> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return "Reset link sent";
  }

  /**
   * Sends parent login credentials via Supabase Edge Function.
   * The Edge Function (send-parent-credentials) uses Resend/SendGrid
   * to email the parent their phone number (username) and auto-generated password.
   */
  async sendCredentials(
    email: string,
    phone: string,
    password: string,
    studentName: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.functions.invoke('send-parent-credentials', {
        body: {
          email,
          phone,
          password,
          studentName,
          loginId: phone.replace(/\D/g, ''), // digits-only phone as login
        },
      });

      if (error) throw error;

      return {
        success: true,
        message: `Credentials sent to ${email}. Phone: ${phone}, Password: ${password}`,
      };
    } catch {
      // Edge function may not be deployed yet — log credentials for admin
      console.warn('[sendCredentials] Edge function unavailable. Credentials:', { email, phone, password });
      return {
        success: false,
        message: `Email delivery pending. Credentials — Phone: ${phone} | Password: ${password}`,
      };
    }
  }
}

export const authRepository = new SupabaseAuthRepository();
