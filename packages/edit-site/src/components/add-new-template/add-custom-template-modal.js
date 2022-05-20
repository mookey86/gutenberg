/**
 * External dependencies
 */
import { get } from 'lodash';
/**
 * WordPress dependencies
 */
import { useState, useMemo, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { decodeEntities } from '@wordpress/html-entities';
import {
	Button,
	Flex,
	FlexItem,
	Icon,
	Modal,
	SearchControl,
	TextHighlight,
	__experimentalHStack as HStack,
	__experimentalText as Text,
	__experimentalHeading as Heading,
} from '@wordpress/components';
import { pin, globe } from '@wordpress/icons';
import { useSelect } from '@wordpress/data';
import { useDebounce } from '@wordpress/compose';
import { speak } from '@wordpress/a11y';

import { store as coreStore } from '@wordpress/core-data';

const EMPTY_ARRAY = [];
const BASE_QUERY = {
	order: 'asc',
	_fields: 'id,title,slug',
	context: 'view',
};

function SuggestionListItem( {
	suggestion,
	search,
	onSelect,
	entityForSuggestions,
} ) {
	return (
		<Button
			className="template-suggestion-item"
			onClick={ () => {
				const title = `Template for: ${ suggestion.name } - ${ entityForSuggestions.labels.singular }`;
				// TODO: check how it can be reused for taxomies, etc..
				onSelect( {
					title,
					description: title,
					slug: `single-${ entityForSuggestions.slug }-${ suggestion.slug }`,
				} );
			} }
		>
			<TextHighlight text={ suggestion.name } highlight={ search } />
		</Button>
	);
}

function SuggestionList( {
	entityForSuggestions,
	onSelect,
	existingTemplateSlugs,
} ) {
	// TODO: `entityForSuggestions` will be used and is an attempt to
	// reuse things for other queries like taxonomies.
	const [ search, setSearch ] = useState( '' );
	const [ suggestions, setSuggestions ] = useState( EMPTY_ARRAY );
	// TODO: debounce search query.
	// const debouncedSearch = useDebounce( setSearch, 250 );
	const { searchResults, searchHasResolved } = useSelect(
		( select ) => {
			if ( ! search ) {
				return { searchResults: EMPTY_ARRAY, searchHasResolved: true };
			}
			const { getEntityRecords, hasFinishedResolution } = select(
				coreStore
			);
			const selectorArgs = [
				'postType',
				entityForSuggestions.slug,
				{
					...BASE_QUERY,
					search,
					orderby: 'relevance',
					// TODO: exclude existing slugs(templates for specific entities)...
					//  exclude: existingTemplateSlugs,
					per_page: 20,
				},
			];
			return {
				searchResults: getEntityRecords( ...selectorArgs ),
				searchHasResolved: hasFinishedResolution(
					'getEntityRecords',
					selectorArgs
				),
			};
		},
		[ search ]
	);

	const entitiesInfo = useMemo( () => {
		if ( ! searchResults?.length ) return EMPTY_ARRAY;
		return mapToIHasNameAndId( searchResults, 'title.rendered' );
	}, [ searchResults ] );
	// Update suggestions only when the query has resolved.
	useEffect( () => {
		if ( ! searchHasResolved ) return;
		setSuggestions( entitiesInfo );
	}, [ entitiesInfo, searchHasResolved ] );
	return (
		<>
			<SearchControl
				className=""
				onChange={ setSearch }
				value={ search }
				label={ __( 'Search' ) }
				placeholder={ __( 'Search' ) }
			/>
			{ !! suggestions?.length && (
				// TODO: we should add a max-height with overflow here..
				<div className="edit-site-block-types-item-list">
					{ suggestions.map( ( suggestion ) => (
						<SuggestionListItem
							key={ suggestion.slug }
							suggestion={ suggestion }
							search={ search }
							onSelect={ onSelect }
							entityForSuggestions={ entityForSuggestions }
						/>
					) ) }
				</div>
			) }
			{ !! search && ! suggestions?.length && <p>No results</p> }
		</>
	);
}

function AddCustomTemplateModal( {
	onClose,
	onSelect,
	existingTemplateSlugs,
	missingPostTypeTemplates,
	entityForSuggestions,
} ) {
	const [ showCustomTypes, setShowCustomTypes ] = useState( false );
	return (
		<Modal
			title={ `Add a template for post type: ${ entityForSuggestions.labels.singular }` }
			closeLabel={ __( 'Close' ) }
			onRequestClose={ onClose }
		>
			{ ! showCustomTypes && (
				<>
					<p>
						{ __(
							'What type of template would you like to create?'
						) }
					</p>
					<Flex
						className="edit-site-components-add-custom-template"
						gap="4"
						align="initial"
					>
						<FlexItem
							isBlock
							onClick={ () =>
								onSelect( {
									slug: entityForSuggestions.template.slug,
									title: entityForSuggestions.template.title,
									description:
										entityForSuggestions.template
											.description,
								} )
							}
						>
							<Icon icon={ globe } />
							<Heading
								level={ 5 }
							>
								{ __( 'General' ) }
							</Heading>
							<Text
								as="span"
							>
								{ `Design a template for all ${ entityForSuggestions.labels.plural }.` }
							</Text>
						</FlexItem>
						<FlexItem
							isBlock
							onClick={
								() => {
									setShowCustomTypes( true );
								}
								// show the available missing types...
							}
						>
							<Icon icon={ pin } />
							<Heading
								level={ 5 }
							>
								{ __( 'Specific' ) }
							</Heading>
							<Text
								as="span"
							>
								{ `Design a template for a specific ${ entityForSuggestions.labels.singular }.` }
							</Text>
						</FlexItem>
					</Flex>{ ' ' }
				</>
			) }
			{ showCustomTypes && (
				<>
					<p>{ `Use the search form below to find or create a template for a certain ${ entityForSuggestions.labels.singular }.` }</p>
					<SuggestionList
						entityForSuggestions={ entityForSuggestions }
						onSelect={ onSelect }
						existingTemplateSlugs={ existingTemplateSlugs }
					/>
				</>
			) }
		</Modal>
	);
}

export default AddCustomTemplateModal;

function mapToIHasNameAndId( entities, path ) {
	return ( entities || [] ).map( ( entity ) => ( {
		...entity,
		name: decodeEntities( get( entity, path ) ),
	} ) );
}
