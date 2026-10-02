import { render } from '@testing-library/react';
import { AccentText } from './AccentText';

it('renders markup as coloured spans and never as HTML', () => {
  const { container } = render(
    <h1>
      <AccentText text={'Platz {lila:sichern}.\n<img src=x onerror=alert(1)>'} />
    </h1>,
  );
  expect(container.querySelector('.accent--lila')).toHaveTextContent('sichern');
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('br')).not.toBeNull();
});
