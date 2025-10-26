
export type Status = 'there' | 'arriving' | 'notthere' | 'untracked';

export interface Squishmallow {
  id: string;
  name: string;
  identified: boolean;
  image: string | null;
  extract: string | null;
  status: Status;
  source: string | null;
}
