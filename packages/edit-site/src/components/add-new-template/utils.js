/**
 * External dependencies
 */
import { get } from 'lodash';

/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { decodeEntities } from '@wordpress/html-entities';

export const usePostTypes = () => {
	const postTypes = useSelect(
		( select ) => select( coreStore ).getPostTypes( { per_page: -1 } ),
		[]
	);
	const excludedPostTypes = [ 'attachment', 'page' ];
	const filteredPostTypes = postTypes?.filter(
		( { viewable, slug } ) =>
			viewable && ! excludedPostTypes.includes( slug )
	);
	return filteredPostTypes;
};

export const useExistingEntitiesToExclude = ( entityForSuggestions ) => {
	const { slugsWithTemplates, type, slug } = entityForSuggestions;
	const { results, hasResolved } = useSelect( ( select ) => {
		if ( ! slugsWithTemplates.length ) {
			return {
				results: [],
				hasResolved: true,
			};
		}
		const { getEntityRecords, hasFinishedResolution } = select( coreStore );
		const selectorArgs = [
			type,
			slug,
			{
				_fields: 'id',
				slug: slugsWithTemplates,
				context: 'view',
			},
		];
		return {
			results: getEntityRecords( ...selectorArgs ),
			hasResolved: hasFinishedResolution(
				'getEntityRecords',
				selectorArgs
			),
		};
	}, [] );
	return [ ( results || [] ).map( ( { id } ) => id ), hasResolved ];
};

export const mapToIHasNameAndId = ( entities, path ) => {
	return ( entities || [] ).map( ( entity ) => ( {
		...entity,
		name: decodeEntities( get( entity, path ) ),
	} ) );
};
