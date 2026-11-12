// CORREÇÃO C02: o guia importa o tipo IconName em StateViews e nas abas, mas
// nunca cria este arquivo. O tipo vem dos nomes válidos do Ionicons, então um
// nome de ícone errado vira erro de compilação, não um ícone em branco.
import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Ionicons>['name'];
