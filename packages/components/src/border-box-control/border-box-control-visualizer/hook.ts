/**
 * WordPress dependencies
 */
import { useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import * as styles from '../styles';
import { useContextSystem, WordPressComponentProps } from '../../ui/context';
import { useCx, rtl } from '../../utils';

import type { VisualizerProps } from '../types';

export function useBorderBoxControlVisualizer(
	props: WordPressComponentProps< VisualizerProps, 'div' >
) {
	const {
		className,
		value,
		__next36pxDefaultSize = false,
		...otherProps
	} = useContextSystem( props, 'BorderBoxControlVisualizer' );

	// Generate class names.
	const cx = useCx();
	const classes = useMemo( () => {
		return cx(
			styles.BorderBoxControlVisualizer( value, __next36pxDefaultSize ),
			className
		);
	}, [ className, value, __next36pxDefaultSize, rtl.watch() ] );

	return { ...otherProps, className: classes, value };
}
