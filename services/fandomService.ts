
import { Squishmallow } from '../types';

const API_BASE = 'https://squishmallowsquad.fandom.com/api.php';

interface FandomLink {
  ns: number;
  exists: string;
  '*': string;
}

interface FandomParseResponse {
  parse: {
    title: string;
    pageid: number;
    links: FandomLink[];
  };
}

interface FandomQueryPage {
  pageid: number;
  ns: number;
  title: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  extract?: string;
  missing?: boolean;
}

interface FandomQueryResponse {
  batchcomplete: string;
  query: {
    pages: Record<string, FandomQueryPage>;
  };
}

export const fetchMasterList = async (): Promise<string[]> => {
  const url = `${API_BASE}?action=parse&page=Master_List&prop=links&format=json&origin=*`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch master list');
  }
  const data: FandomParseResponse = await response.json();
  const links = data.parse?.links
    ?.map(p => p['*'])
    .filter(t => !t.includes(':')) ?? [];
  return links;
};

export const fetchItemDetails = async (items: Squishmallow[]): Promise<Squishmallow[]> => {
    const titles = items.map(b => encodeURIComponent(b.name)).join('|');
    const url = `${API_BASE}?action=query&titles=${titles}&prop=pageimages|extracts&format=json&pithumbsize=400&exintro=1&explaintext=1&origin=*`;

    const response = await fetch(url);
    if (!response.ok) {
        console.warn(`Batch fetch failed for titles: ${titles}`);
        return items;
    }

    const data: FandomQueryResponse = await response.json();
    const updatedItems = [...items];

    if (data.query?.pages) {
        Object.values(data.query.pages).forEach(page => {
            if (page.missing) return;
            const match = updatedItems.find(item => item.name === page.title);
            if (match) {
                match.identified = true;
                if (page.thumbnail?.source) match.image = page.thumbnail.source;
                if (page.extract) match.extract = page.extract;
                match.source = `https://squishmallowsquad.fandom.com/wiki/${encodeURIComponent(page.title)}`;
            }
        });
    }
    return updatedItems;
};
