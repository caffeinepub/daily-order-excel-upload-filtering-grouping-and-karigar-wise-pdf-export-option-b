declare global {
  interface Window {
    XLSX: {
      read(data: any, opts?: {
        type?: 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string';
        cellDates?: boolean;
        cellNF?: boolean;
        cellText?: boolean;
        sheetRows?: number;
        bookDeps?: boolean;
        bookFiles?: boolean;
        bookProps?: boolean;
        bookSheets?: boolean;
        bookVBA?: boolean;
        password?: string;
        sheets?: number | string | string[];
      }): {
        SheetNames: string[];
        Sheets: { [sheet: string]: any };
      };
      utils: {
        sheet_to_json<T = any>(worksheet: any, opts?: {
          header?: 'A' | number | string[];
          range?: any;
          raw?: boolean;
          defval?: any;
          blankrows?: boolean;
        }): T[];
      };
    };
  }
}

export {};
