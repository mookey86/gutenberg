/**
 * External dependencies
 */
import { getEditorHtml } from 'test/helpers';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

/**
 * WordPress dependencies
 */
import { getBlockTypes, unregisterBlockType } from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/block-library';

/**
 * Internal dependencies
 */
import {
	initializeWithBlocksLayouts,
	fireLongPress,
	firePanGesture,
	TouchEventType,
} from './helpers';

// Mock throttle to allow updating the dragging position on every "onDragOver" event.
jest.mock( 'lodash', () => ( {
	...jest.requireActual( 'lodash' ),
	throttle: ( fn ) => {
		fn.cancel = jest.fn();
		return fn;
	},
} ) );

beforeAll( () => {
	// Register all core blocks
	registerCoreBlocks();
} );

afterAll( () => {
	// Clean up registered blocks
	getBlockTypes().forEach( ( block ) => {
		unregisterBlockType( block.name );
	} );
} );

const TOUCH_EVENT_ID = 1;
const BLOCKS = [
	{
		name: 'Paragraph',
		html: `
		<!-- wp:paragraph -->
		<p>This is a paragraph.</p>
		<!-- /wp:paragraph -->`,
		layout: { x: 0, y: 0, width: 100, height: 100 },
	},
	{
		name: 'Image',
		html: `
		<!-- wp:image {"sizeSlug":"large"} -->
		<figure class="wp-block-image size-large"><img src="https://cldup.com/cXyG__fTLN.jpg" alt=""/></figure>
		<!-- /wp:image -->`,
		layout: { x: 0, y: 100, width: 100, height: 100 },
	},
	{
		name: 'Spacer',
		html: `
		<!-- wp:spacer -->
		<div style="height:100px" aria-hidden="true" class="wp-block-spacer"></div>
		<!-- /wp:spacer -->`,
		layout: { x: 0, y: 200, width: 100, height: 100 },
	},
];

describe( 'BlockDraggable', () => {
	it( 'enables drag mode', async () => {
		const {
			getByA11yLabel,
			getByTestId,
		} = await initializeWithBlocksLayouts( BLOCKS );

		fireLongPress(
			getByA11yLabel( /Paragraph Block\. Row 1/ ),
			/draggable\-trigger\-content/
		);
		expect( getByTestId( 'draggable-chip' ) ).toBeVisible();

		firePanGesture( getByGestureTestId( 'block-draggable-wrapper' ), [
			{
				id: TOUCH_EVENT_ID,
				eventType: TouchEventType.TOUCHES_DOWN,
				x: 0,
				y: 0,
			},
		] );

		let draggableChip;
		try {
			draggableChip = getByTestId( 'draggable-chip' );
		} catch ( e ) {
			// NOOP.
		}
		expect( draggableChip ).not.toBeDefined();
	} );

	it( 'moves blocks', async () => {
		const { getByA11yLabel } = await initializeWithBlocksLayouts( BLOCKS );
		const blockDraggableWrapper = getByGestureTestId(
			'block-draggable-wrapper'
		);

		expect( getEditorHtml() ).toMatchSnapshot( 'Initial order' );

		// Move Paragraph block from first to second position
		fireLongPress(
			getByA11yLabel( /Paragraph Block\. Row 1/ ),
			/draggable\-trigger\-content/
		);
		firePanGesture( blockDraggableWrapper, [
			{
				id: TOUCH_EVENT_ID,
				eventType: TouchEventType.TOUCHES_DOWN,
				x: 0,
				y: 0,
			},
			{
				id: TOUCH_EVENT_ID,
				eventType: TouchEventType.TOUCHES_MOVE,
				x: 0,
				// Dropping position is in the second half of the second block's height.
				y: 180,
			},
		] );
		expect( getEditorHtml() ).toMatchSnapshot(
			'Paragraph block moved from first to second position'
		);

		// Move Spacer block from third to first position
		fireLongPress(
			getByA11yLabel( /Spacer Block\. Row 3/ ),
			/draggable\-trigger\-content/
		);
		firePanGesture( blockDraggableWrapper, [
			{
				id: TOUCH_EVENT_ID,
				eventType: TouchEventType.TOUCHES_DOWN,
				x: 0,
				y: 250,
			},
			{
				id: TOUCH_EVENT_ID,
				eventType: TouchEventType.TOUCHES_MOVE,
				x: 0,
				y: 0,
			},
		] );
		expect( getEditorHtml() ).toMatchSnapshot(
			'Spacer block moved from third to first position'
		);
	} );
} );
