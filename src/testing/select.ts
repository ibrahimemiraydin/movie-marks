import { fireEvent, screen } from '@testing-library/react';
export function chooseSelect(labelOrElement: string | HTMLElement, value: string) {
  const trigger = typeof labelOrElement === 'string' ? screen.getByRole('combobox', { name: labelOrElement }) : labelOrElement;
  fireEvent.click(trigger);
  if (trigger.getAttribute('aria-expanded') !== 'true') throw new Error('Menü açılmadı.');
  // jsdom native popover'ın top-layer görünürlüğünü uygulamaz; gerçek görünürlük Chromium smoke testinde kontrol edilir.
  const option = screen.getAllByRole('option', { hidden: true }).find(option => option.getAttribute('data-value') === value);
  if (!option) throw new Error(`Seçenek bulunamadı: ${value}`);
  fireEvent.click(option);
}
