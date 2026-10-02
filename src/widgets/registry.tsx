import type { ComponentType } from 'react';
import { GenericWidget } from './GenericWidget';
import { MinecraftWidget } from './MinecraftWidget';
import { UptimeKumaWidget } from './UptimeKumaWidget';

export interface WidgetProps<T = unknown> {
  name: string;
  data: T;
}

export interface WidgetDefinition {
  component: ComponentType<WidgetProps<never>>;
  /** wide widgets span two grid columns */
  wide?: boolean;
}

/**
 * Frontend counterpart of the backend IntegrationProvider beans: maps an integration type to its widget.
 * To add a data source, implement the provider in the backend and register its widget here.
 */
export const widgetRegistry: Record<string, WidgetDefinition> = {
  'uptime-kuma': { component: UptimeKumaWidget, wide: true },
  minecraft: { component: MinecraftWidget },
};

export function widgetFor(type: string): WidgetDefinition {
  return widgetRegistry[type] ?? { component: GenericWidget };
}
