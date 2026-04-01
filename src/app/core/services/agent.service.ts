import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
} from '../models/agent.model';

@Injectable({
  providedIn: 'root',
})
export class AgentService {
  private readonly TABLE = 'agents';

  constructor(private supabase: SupabaseService) {}

  private generatePublicKey(): string {
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'af_pk_';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getAgents(): Promise<Agent[]> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }

    return data as Agent[];
  }

  async getAgent(id: string): Promise<Agent> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }

    return data as Agent;
  }

  async getAgentByPublicKey(publicKey: string): Promise<Agent> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('*')
      .eq('public_key', publicKey)
      .single();

    if (error) {
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }

    return data as Agent;
  }

  async createAgent(request: CreateAgentRequest): Promise<Agent> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const agentData = {
      ...request,
      user_id: user.id,
      public_key: this.generatePublicKey(),
    };

    const { data, error } = await this.supabase
      .from(this.TABLE)
      .insert(agentData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create agent: ${error.message}`);
    }

    return data as Agent;
  }

  async updateAgent(id: string, request: UpdateAgentRequest): Promise<Agent> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .update(request)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update agent: ${error.message}`);
    }

    return data as Agent;
  }

  async deleteAgent(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete agent: ${error.message}`);
    }
  }

  async regeneratePublicKey(id: string): Promise<Agent> {
    const newKey = this.generatePublicKey();

    const { data, error } = await this.supabase
      .from(this.TABLE)
      .update({ public_key: newKey })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to regenerate public key: ${error.message}`);
    }

    return data as Agent;
  }
}
