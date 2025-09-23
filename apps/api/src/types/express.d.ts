import 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
      tenantId?: string;
    }

    interface Request {
      user?: User;
      tenant?: {
        id: string;
        slug: string;
        plan: string;
        features: string[];
        limits: Record<string, number>;
        status: string;
      };
      tenantContext?: any;
    }
  }
}
