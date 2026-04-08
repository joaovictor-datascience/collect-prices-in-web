export function inferStoreNameFromUrl(value) {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, '');
    const [mainDomain] = hostname.split('.');
    return mainDomain ? mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1) : hostname;
  } catch {
    return 'Loja';
  }
}
