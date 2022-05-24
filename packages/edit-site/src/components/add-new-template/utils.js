/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';

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
