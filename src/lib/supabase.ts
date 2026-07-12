import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ejvsfdepfheohdlowuya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdnNmZGVwZmhlb2hkbG93dXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzIxOTUsImV4cCI6MjA4NzgwODE5NX0.3wfhO7JfigSuFiZQEZa-TVTnWLN_4Wqw4DhWRH8eqGs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchAll<T = any>(
  table: string,
  select = '*',
  orderField?: string | { column: string; ascending?: boolean }[],
  ascending = true,
  eqFilters: { column: string; value: any }[] = []
): Promise<{ data: T[] | null; error: any }> {
  let allData: T[] = [];
  let from = 0;
  const pageSize = 1000;
  let keepFetching = true;

  while (keepFetching) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);

    for (const filter of eqFilters) {
      query = query.eq(filter.column, filter.value);
    }

    if (orderField) {
      if (Array.isArray(orderField)) {
        for (const ord of orderField) {
          query = query.order(ord.column, { ascending: ord.ascending !== false });
        }
      } else {
        query = query.order(orderField, { ascending });
      }
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    if (data && data.length > 0) {
      allData = [...allData, ...(data as T[])];
      from += pageSize;
      if (data.length < pageSize) {
        keepFetching = false;
      }
    } else {
      keepFetching = false;
    }
  }

  return { data: allData, error: null };
}

