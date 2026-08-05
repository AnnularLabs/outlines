export interface Work {
  id: string;
  image: string;
  thumbnails: {
    small: string;
    medium: string;
    large: string;
  };
  year: string;
}
