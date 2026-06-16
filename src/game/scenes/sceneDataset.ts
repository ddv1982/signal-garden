export function clearGardenHostDataset(hostElement: HTMLElement) {
  delete hostElement.dataset.activeLensX;
  delete hostElement.dataset.activeLensY;
  delete hostElement.dataset.ambientMotion;
  delete hostElement.dataset.ambientZones;
  delete hostElement.dataset.signalMotion;
}
