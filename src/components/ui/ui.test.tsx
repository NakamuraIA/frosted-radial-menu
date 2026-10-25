// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Badge, Button, Slider, Switch } from './index';

afterEach(cleanup);

describe('Button', () => {
  it('renderiza o rótulo e aplica a variante', () => {
    render(<Button variant="primary">Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button.className).toContain('ui-btn--primary');
    expect(button).toBeEnabled();
  });

  it('respeita disabled e loading', () => {
    const { rerender } = render(<Button disabled>Salvar</Button>);
    expect(screen.getByRole('button')).toBeDisabled();

    rerender(<Button loading>Salvar</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(document.querySelector('.ui-btn__spinner')).not.toBeNull();
  });

  it('dispara onClick quando habilitado', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Executar</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Executar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Switch', () => {
  it('reflete o estado em aria-checked', () => {
    render(
      <Switch label="Iniciar com o Windows" checked={false} onChange={() => {}} />,
    );
    expect(screen.getByRole('switch', { name: 'Iniciar com o Windows' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('pede o próximo valor ao clicar', () => {
    const onChange = vi.fn();
    render(<Switch label="Percentuais" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Percentuais' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('não dispara quando desabilitado', () => {
    const onChange = vi.fn();
    render(<Switch label="Auto-start" checked={false} disabled onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Auto-start' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Slider', () => {
  it('mostra valor atual e limites', () => {
    render(
      <Slider label="Raio interno" value={142} min={88} max={220} step={1} unit="px" onChange={() => {}} />,
    );

    expect(screen.getByText('142px')).toBeTruthy();
    expect(screen.getByText('88px')).toBeTruthy();
    expect(screen.getByText('220px')).toBeTruthy();
  });

  it('emite o número digitado no range', () => {
    const onChange = vi.fn();
    render(
      <Slider label="Escala" value={1} min={0.45} max={1.3} step={0.01} unit="x" onChange={onChange} />,
    );

    fireEvent.change(screen.getByLabelText('Escala'), { target: { value: '1.2' } });
    expect(onChange).toHaveBeenCalledWith(1.2);
  });

  it('formata passos fracionários sem zeros sobrando', () => {
    render(
      <Slider label="Vidro" value={0.72} min={0.42} max={0.9} step={0.02} onChange={() => {}} />,
    );
    expect(screen.getByText('0.72')).toBeTruthy();
    expect(screen.getByText('0.9')).toBeTruthy();
  });
});

describe('Badge', () => {
  it('aplica o tom e o ponto de status', () => {
    render(
      <Badge tone="success" dot>
        Alterações salvas
      </Badge>,
    );

    const badge = screen.getByText('Alterações salvas');
    expect(badge.className).toContain('ui-badge--success');
    expect(badge.querySelector('.ui-badge__dot')).not.toBeNull();
  });
});
