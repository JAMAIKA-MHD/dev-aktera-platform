/** Text ready to be searched: ignores case and accents. */
export const searchable = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
