import {
  databaseService,
  DatabaseService,
} from '../src/services/database.service';

/**
 * Tool registry entry for seeding database.
 */
export interface ToolEntry {
  key: string;
  name: string;
  description: string;
  active: boolean;
}

/**
 * Database seeding utility for creating tools registry data.
 * Provides methods to populate the database with initial tool entries.
 */
export class ToolsSeed {
  /**
   * Ensures the database connection is initialized before running queries.
   */
  private static async ensureDatabaseConnection(): Promise<void> {
    const status = databaseService.getStatus();
    if (!status.isConnected) {
      const dbConfig = DatabaseService.parseConnectionUrl(
        this.getDatabaseUrl()
      );
      await databaseService.initialize(dbConfig);
    }
  }

  private static getDatabaseUrl(): string {
    if (
      process.env.DATABASE_URL &&
      process.env.DATABASE_URL.trim().length > 0
    ) {
      return process.env.DATABASE_URL;
    }

    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const name = process.env.DB_NAME || 'nodeangularfullstack';
    const user = process.env.DB_USER || 'dbuser';
    const password = process.env.DB_PASSWORD || 'dbpassword';

    return `postgresql://${user}:${password}@${host}:${port}/${name}`;
  }

  /**
   * Initial tools registry entries for seeding.
   * These tools can be enabled/disabled by super admin.
   */
  private static readonly INITIAL_TOOLS: ToolEntry[] = [
    {
      key: 'short-link',
      name: 'Short Link Generator',
      description:
        'Generate shortened URLs for sharing long links with analytics tracking',
      active: true,
    },
  ];

  /**
   * Creates a single tool entry in the database.
   * @param tool - Tool data to insert
   * @returns Promise that resolves when tool is created
   * @throws Error if tool creation fails
   */
  public static async createTool(tool: ToolEntry): Promise<void> {
    try {
      const query = `
        INSERT INTO tools (
          key,
          name,
          description,
          active
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          active = EXCLUDED.active,
          updated_at = CURRENT_TIMESTAMP
      `;

      const params = [tool.key, tool.name, tool.description, tool.active];

      await databaseService.query(query, params);
      console.log(`✅ Created tool: ${tool.name} (${tool.key})`);
    } catch (error) {
      console.error(`❌ Failed to create tool ${tool.key}:`, error);
      throw error;
    }
  }

  /**
   * Creates all initial tool entries in the database.
   * Uses upsert to update existing tools if they already exist.
   * @returns Promise that resolves when all tools are created
   */
  public static async createInitialTools(): Promise<void> {
    try {
      console.log('🔧 Creating initial tools registry...');

      for (const tool of this.INITIAL_TOOLS) {
        await this.createTool(tool);
      }

      console.log(
        `🎉 Successfully created ${this.INITIAL_TOOLS.length} tool entries`
      );
    } catch (error) {
      console.error('❌ Failed to create initial tools:', error);
      throw error;
    }
  }

  /**
   * Seeds the tools table with initial data.
   * @returns Promise that resolves when seeding is complete
   */
  public static async seedTools(): Promise<void> {
    try {
      console.log('🌱 Starting tools seeding process...');

      await this.ensureDatabaseConnection();
      await this.createInitialTools();

      console.log('🎉 Tools seeding completed successfully');
      console.log('📋 Initial tools:');
      this.INITIAL_TOOLS.forEach((tool) => {
        console.log(
          `   ${tool.name} (${tool.key}) - ${tool.active ? 'enabled' : 'disabled'}`
        );
      });
    } catch (error) {
      console.error('❌ Tools seeding failed:', error);
      throw error;
    }
  }

  /**
   * Gets the list of initial tools for reference.
   * @returns Array of initial tool entries
   */
  public static getInitialTools(): ToolEntry[] {
    return [...this.INITIAL_TOOLS];
  }

  /**
   * Verifies that initial tools were created correctly.
   * @returns Promise that resolves to verification results
   */
  public static async verifyInitialTools(): Promise<{
    success: boolean;
    toolsFound: number;
    expectedTools: number;
    missingTools: string[];
  }> {
    try {
      await this.ensureDatabaseConnection();

      const expectedKeys = this.INITIAL_TOOLS.map((t) => t.key);
      const missingTools: string[] = [];

      for (const key of expectedKeys) {
        const result = await databaseService.query(
          'SELECT key FROM tools WHERE key = $1',
          [key]
        );

        if (result.rows.length === 0) {
          missingTools.push(key);
        }
      }

      return {
        success: missingTools.length === 0,
        toolsFound: expectedKeys.length - missingTools.length,
        expectedTools: expectedKeys.length,
        missingTools,
      };
    } catch (error) {
      console.error('❌ Failed to verify initial tools:', error);
      return {
        success: false,
        toolsFound: 0,
        expectedTools: this.INITIAL_TOOLS.length,
        missingTools: this.INITIAL_TOOLS.map((t) => t.key),
      };
    }
  }

  /**
   * Clears all tools data from the database.
   * WARNING: This will delete all tools entries!
   * @returns Promise that resolves when cleanup is complete
   */
  public static async clearToolsData(): Promise<void> {
    try {
      console.log('🧹 Clearing tools data...');

      await this.ensureDatabaseConnection();
      await databaseService.query('DELETE FROM tools');

      console.log('✅ Tools data cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear tools data:', error);
      throw error;
    }
  }
}
