/**
 * External dependencies
 */
import { filter, includes } from 'lodash';

/**
 * WordPress dependencies
 */
import {
	DropdownMenu,
	MenuGroup,
	MenuItem,
	NavigableMenu,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';
import {
	archive,
	blockMeta,
	category,
	home,
	list,
	media,
	notFound,
	page,
	post,
	postAuthor,
	postDate,
	search,
	tag,
} from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';

/**
 * Internal dependencies
 */
import AddCustomTemplateModal from './add-custom-template-modal';
import { usePostTypes } from './utils';
import { useHistory } from '../routes';
import { store as editSiteStore } from '../../store';

// TODO: check why we need info from `__experimentalGetDefaultTemplateTypes` and here in js..
const DEFAULT_TEMPLATE_SLUGS = [
	'front-page',
	// TODO: Info about this need to be change from `post` to make it clear we are creating `single` template.
	'single',
	// TODO: need to update `get_default_block_template_types` for 6.1 and where this change cascades.
	// 'page',
	'index',
	'archive',
	'author',
	'category',
	'date',
	'tag',
	'taxonomy',
	'search',
	'404',
];

const TEMPLATE_ICONS = {
	'front-page': home,
	single: post,
	page,
	archive,
	search,
	404: notFound,
	index: list,
	category,
	author: postAuthor,
	taxonomy: blockMeta,
	date: postDate,
	tag,
	attachment: media,
};

export default function NewTemplate( { postType } ) {
	const history = useHistory();
	const postTypes = usePostTypes();
	const [ showCustomTemplateModal, setShowCustomTemplateModal ] = useState(
		false
	);
	const [ entityForSuggestions, setEntityForSuggestions ] = useState( {} );
	const { templates, defaultTemplateTypes } = useSelect(
		( select ) => ( {
			templates: select( coreStore ).getEntityRecords(
				'postType',
				'wp_template',
				{ per_page: -1 }
			),
			defaultTemplateTypes: select(
				editorStore
			).__experimentalGetDefaultTemplateTypes(),
		} ),
		[]
	);
	const { saveEntityRecord } = useDispatch( coreStore );
	const { createErrorNotice } = useDispatch( noticesStore );
	const { setTemplate } = useDispatch( editSiteStore );

	async function createTemplate( template ) {
		try {
			const { title, description, slug } = template;
			const newTemplate = await saveEntityRecord(
				'postType',
				'wp_template',
				{
					description,
					// Slugs need to be strings, so this is for template `404`
					slug: slug.toString(),
					status: 'publish',
					title,
				},
				{ throwOnError: true }
			);

			// Set template before navigating away to avoid initial stale value.
			setTemplate( newTemplate.id, newTemplate.slug );

			// Navigate to the created template editor.
			history.push( {
				postId: newTemplate.id,
				postType: newTemplate.type,
			} );

			// TODO: Add a success notice?
		} catch ( error ) {
			const errorMessage =
				error.message && error.code !== 'unknown_error'
					? error.message
					: __( 'An error occurred while creating the template.' );

			createErrorNotice( errorMessage, {
				type: 'snackbar',
			} );
		}
	}

	const existingTemplateSlugs = ( templates || [] ).map(
		( { slug } ) => slug
	);

	// TODO: rename to missingDefaultTemplates(or combine these arrays like`missingPostTypeTemplates`).
	// Also it's weird that we don't have a single source of truth for the default templates. Needs looking..
	const missingTemplates = filter(
		defaultTemplateTypes,
		( template ) =>
			includes( DEFAULT_TEMPLATE_SLUGS, template.slug ) &&
			! includes( existingTemplateSlugs, template.slug )
	);

	// TODO: we will need to update the check as the menu item should always
	// be there to create a specific 'post' template(ex post-$posttype-$slug)
	// Also we might need to check if there are `posts` from the $postType as,
	// it would show a search with no posts available..
	// TODO: make all strings translatable.
	const extraTemplates = ( postTypes || [] ).reduce(
		( accumulator, _postType ) => {
			const {
				slug,
				labels: { singular_name: singularName },
				menu_icon: icon,
				name,
			} = _postType;
			// `page` post type is the single exception for `single-$post_type` and archive rule.
			const isPage = slug === 'page';
			const hasGeneralTemplate = existingTemplateSlugs?.includes(
				isPage ? slug : `single-${ slug }`
			);
			accumulator.push( {
				slug: isPage ? slug : `single-${ slug }`,
				title: `Single ${ singularName }`,
				description: `Displays a single ${ singularName }.`,
				icon,
				onClick: ( template ) => {
					setShowCustomTemplateModal( true );
					setEntityForSuggestions( {
						type: 'postType',
						slug,
						labels: { singular: singularName, plural: name },
						hasGeneralTemplate,
						template,
					} );
				},
			} );
			// Add conditionally the `archive-$post_type` item.
			if ( ! existingTemplateSlugs?.includes( `archive-${ slug }` ) ) {
				accumulator.push( {
					slug: `archive-${ slug }`,
					title: `${ singularName } archive`,
					description: `Displays archive of ${ name }.`,
					icon,
				} );
			}
			return accumulator;
		},
		[]
	);

	// TODO: better handling here.
	if ( ! missingTemplates.length && ! extraTemplates.length ) {
		return null;
	}

	// Update the sort order to match the DEFAULT_TEMPLATE_SLUGS order.
	// TODO: check sorting with new items.
	missingTemplates?.sort( ( template1, template2 ) => {
		return (
			DEFAULT_TEMPLATE_SLUGS.indexOf( template1.slug ) -
			DEFAULT_TEMPLATE_SLUGS.indexOf( template2.slug )
		);
	} );

	// Append all extra templates at the end of the list for now.
	missingTemplates.push( ...extraTemplates );

	return (
		<>
			<DropdownMenu
				className="edit-site-new-template-dropdown"
				icon={ null }
				text={ postType.labels.add_new }
				label={ postType.labels.add_new_item }
				popoverProps={ {
					noArrow: false,
				} }
				toggleProps={ {
					variant: 'primary',
				} }
			>
				{ () => (
					<NavigableMenu className="edit-site-new-template-dropdown__popover">
						<MenuGroup label={ postType.labels.add_new_item }>
							{ missingTemplates.map( ( template ) => {
								const {
									title,
									description,
									slug,
									onClick,
									icon,
								} = template;
								return (
									<MenuItem
										icon={
											icon ||
											TEMPLATE_ICONS[ slug ] ||
											post
										}
										iconPosition="left"
										info={ description }
										key={ slug }
										onClick={ () =>
											!! onClick
												? onClick( template )
												: createTemplate( template )
										}
									>
										{ title }
									</MenuItem>
								);
							} ) }
						</MenuGroup>
					</NavigableMenu>
				) }
			</DropdownMenu>
			{ showCustomTemplateModal && (
				<AddCustomTemplateModal
					onClose={ () => setShowCustomTemplateModal( false ) }
					existingTemplateSlugs={ existingTemplateSlugs }
					onSelect={ createTemplate }
					entityForSuggestions={ entityForSuggestions }
				/>
			) }
		</>
	);
}
