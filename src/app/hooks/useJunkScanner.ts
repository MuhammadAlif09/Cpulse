import { useCleanerStore, JunkItem as StoreJunkItem } from "../store/useCleanerStore";

export type JunkItem = StoreJunkItem;

export function useJunkScanner() {
  const store = useCleanerStore();

  return {
    scanning: store.scanning,
    progress: store.progress,
    done: store.done,
    cleaning: store.cleaning,
    cleaned: store.cleaned,
    junkCats: store.junkCats,
    selected: store.selected,
    setSelected: store.setSelected,
    startScan: store.startScan,
    doClean: store.doClean,
  };
}
