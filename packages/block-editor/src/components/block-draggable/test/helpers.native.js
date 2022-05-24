/**
 * External dependencies
 */
import { act, fireEvent, initializeEditor, within } from 'test/helpers';
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';

const frameTime = 1000 / 60;
let requestAnimationFrameCopy;
let cancelAnimationFrameCopy;

// Touch event type constants have been extracted from original source code, as they are not exported in the package.
// Reference: https://github.com/software-mansion/react-native-gesture-handler/blob/90895e5f38616a6be256fceec6c6a391cd9ad7c7/src/TouchEventType.ts
export const TouchEventType = {
	UNDETERMINED: 0,
	TOUCHES_DOWN: 1,
	TOUCHES_MOVE: 2,
	TOUCHES_UP: 3,
	TOUCHES_CANCELLED: 4,
};

/**
 * @typedef  {Object} WPBlockWithLayout
 * @property {string} name          Name of the block (e.g. Paragraph).
 * @property {string} html          HTML content.
 * @property {Object} layout        Layout data.
 * @property {Object} layout.x      X position.
 * @property {Object} layout.y      Y position.
 * @property {Object} layout.width  Width.
 * @property {Object} layout.height Height.
 */

/**
 * Initialize the editor with an array of blocks that include their HTML and layout.
 *
 * @param {WPBlockWithLayout[]} blocks Initial blocks.
 *
 * @return {import('@testing-library/react-native').RenderAPI} The Testing Library screen.
 */
export const initializeWithBlocksLayouts = async ( blocks ) => {
	const initialHtml = blocks.map( ( block ) => block.html ).join( '\n' );

	const screen = await initializeEditor( { initialHtml } );
	const { getByA11yLabel } = screen;

	blocks.forEach( ( block, index ) => {
		const a11yLabel = new RegExp(
			`${ block.name } Block\\. Row ${ index + 1 }`
		);
		fireEvent( getByA11yLabel( a11yLabel ), 'layout', {
			nativeEvent: { layout: block.layout },
		} );
	} );

	return screen;
};

/**
 * Fires long-press gesture event on a block.
 *
 * @param {import('react-test-renderer').ReactTestInstance} block  Block test instance.
 * @param {string}                                          testID Id for querying the draggable trigger element.
 */
export const fireLongPress = ( block, testID ) =>
	withReanimatedTimer( () => {
		const draggableTrigger = within( block ).getByTestId( testID );
		fireGestureHandler( draggableTrigger, [
			{ oldState: State.BEGAN, state: State.ACTIVE },
			{ state: State.ACTIVE },
			{ state: State.END },
		] );
		// Advance timers one frame to ensure that shared values
		// are updated and trigger animation reactions.
		act( () => advanceAnimationByFrame( 1 ) );
	} );

/**
 * Fires pan gesture event on a BlockDraggable component.
 *
 * @param {import('react-test-renderer').ReactTestInstance} blockDraggable BlockDraggable test instance.
 * @param {Object}                                          touchEvents    Array of touch events to dispatch on the pan gesture.
 */
export const firePanGesture = ( blockDraggable, touchEvents ) =>
	withReanimatedTimer( () => {
		const gestureTouchEvents = touchEvents.map(
			( { eventType, ...touchEvent } ) => ( {
				allTouches: [ touchEvent ],
				eventType,
			} )
		);
		fireGestureHandler( blockDraggable, [
			// TOUCHES_DOWN event is only received on ACTIVE state, so we have to fire it manually.
			{ oldState: State.BEGAN, state: State.ACTIVE },
			...gestureTouchEvents,
			{ state: State.END },
		] );
		// Advance timers one frame to ensure that shared values
		// are updated and trigger animation reactions.
		act( () => advanceAnimationByFrame( 1 ) );
	} );

/**
 * Prepare timers for invoking a function that uses Reanimated.
 *
 * NOTE: This code is based on a similar function provided by the Reanimated library.
 * Reference: https://github.com/software-mansion/react-native-reanimated/blob/b4ee4ea9a1f246c461dd1819c6f3d48440a25756/src/reanimated2/jestUtils.ts#L170-L174
 *
 * @param {Function} fn Function to invoke.
 */
export const withReanimatedTimer = ( fn ) => {
	// Reanimated uses "requestAnimationFrame" for notifying shared value updates when using "useAnimatedReaction" hook.
	// For testing, we mock the "requestAnimationFrame" so it calls the callback passed instantly.
	requestAnimationFrameCopy = global.requestAnimationFrame;
	cancelAnimationFrameCopy = global.cancelAnimationFrame;

	global.requestAnimationFrame = ( callback ) =>
		setTimeout( callback, frameTime );

	jest.useFakeTimers( 'legacy' );
	fn();
	jest.useRealTimers();

	global.requestAnimationFrame = requestAnimationFrameCopy;
	global.cancelAnimationFrame = cancelAnimationFrameCopy;
};

/**
 * Advance Jest timers by time.
 * This helper should be called within a function invoked by "withReanimatedTimer".
 *
 * NOTE: This code is based on a similar function provided by the Reanimated library.
 * Reference: https://github.com/software-mansion/react-native-reanimated/blob/b4ee4ea9a1f246c461dd1819c6f3d48440a25756/src/reanimated2/jestUtils.ts#L176-L181
 *
 * @param {number} time Time to advance timers.
 */
export const advanceAnimationByTime = ( time = frameTime ) => {
	for ( let i = 0; i <= Math.ceil( time / frameTime ); i++ ) {
		jest.advanceTimersByTime( frameTime );
	}
	jest.advanceTimersByTime( frameTime );
};

/**
 * Advance Jest timers by frames.
 * This helper should be called within a function invoked by "withReanimatedTimer".
 *
 * NOTE: This code is based on a similar function provided by the Reanimated library.
 * Reference: https://github.com/software-mansion/react-native-reanimated/blob/b4ee4ea9a1f246c461dd1819c6f3d48440a25756/src/reanimated2/jestUtils.ts#L183-L188
 *
 * @param {number} count Number of frames to advance timers.
 */
export const advanceAnimationByFrame = ( count ) => {
	for ( let i = 0; i <= count; i++ ) {
		jest.advanceTimersByTime( frameTime );
	}
	jest.advanceTimersByTime( frameTime );
};
