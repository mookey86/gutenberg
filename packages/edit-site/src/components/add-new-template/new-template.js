/**
 * External dependencies
 */
import { filter, find, includes, map } from 'lodash';

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

const DEFAULT_TEMPLATE_SLUGS = [
	'front-page',
	// TODO: Info about this need to be change from `post` to make it clear we are creating `single` template.
	'single',
	'page',
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

	const existingTemplateSlugs = map( templates, 'slug' );

	const missingTemplates = filter(
		defaultTemplateTypes,
		( template ) =>
			includes( DEFAULT_TEMPLATE_SLUGS, template.slug ) &&
			! includes( existingTemplateSlugs, template.slug )
	);

	// TODO: we will need to update the check as the menu item should always
	// be there to create a specicif 'post' template(ex post-$posttype-$slug)
	const missingPostTypeTemplates = postTypes?.filter( ( _postType ) => {
		const { slug } = _postType;
		return ! existingTemplateSlugs?.includes( `single-${ slug }` );
	} );

	const hasMissingPostTypeTemplates = !! missingPostTypeTemplates?.length;
	let extraTemplates = [];
	if ( hasMissingPostTypeTemplates ) {
		//TODO: if the only available post types is `post`, should we just
		// fallback to what we have now to create `single` and not `single-post`?

		// map to `single` default template
		extraTemplates = missingPostTypeTemplates.map( ( _postType ) => {
			const {
				slug,
				labels: { singular_name: singularName },
				menu_icon: icon,
				name,
			} = _postType;
			return {
				slug: `single-${ slug }`,
				title: `Single ${ name }`,
				description: `Displays a single ${ name }.`,
				icon,
				onClick: ( template ) => {
					setShowCustomTemplateModal( true );
					setEntityForSuggestions( {
						type: 'postType',
						slug,
						labels: { singular: singularName, plural: name },
						template,
					} );
				},
			};
		} );
		// missingTemplates.push( ...extraTemplates );
	}
	// TODO: create `archive-$postType in a better way of course
	const missingPostTypeArchiveTemplates = postTypes?.filter(
		( _postType ) => {
			const { slug } = _postType;
			return ! existingTemplateSlugs?.includes( `archive-${ slug }` );
		}
	);
	if ( !! missingPostTypeArchiveTemplates?.length ) {
		extraTemplates.push(
			...missingPostTypeArchiveTemplates.map( ( _postType ) => {
				const {
					slug,
					// labels: { singular_name: singularName },
					menu_icon: icon,
					name,
				} = _postType;
				return {
					slug: `archive-${ slug }`,
					title: `Archive ${ name }`,
					description: `Displays archive of ${ name }.`,
					icon,
					// onClick: ( template ) => {
					// 	setShowCustomTemplateModal( true );
					// 	setEntityForSuggestions( {
					// 		type: 'postType',
					// 		slug,
					// 		labels: { singular: singularName, plural: name },
					// 		template,
					// 	} );
					// },
				};
			} )
		);
		// missingTemplates.push( ...extraTemplates );
	}

	if ( ! missingTemplates.length && ! extraTemplates.length ) {
		return null;
	}

	// Update the sort order to match the DEFAULT_TEMPLATE_SLUGS order.
	// TODO: check sorting with new items.
	missingTemplates.sort( ( template1, template2 ) => {
		return (
			DEFAULT_TEMPLATE_SLUGS.indexOf( template1.slug ) -
			DEFAULT_TEMPLATE_SLUGS.indexOf( template2.slug )
		);
	} );

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
						{ hasMissingPostTypeTemplates && (
							<MenuGroup label="Extra templates - change me">
								{ extraTemplates.map( ( template ) => {
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
											onClick={
												() =>
													!! onClick
														? onClick( template )
														: createTemplate(
																template
														  )
												// We will be navigated way so no need to close the dropdown.
											}
										>
											{ title }
										</MenuItem>
									);
								} ) }
							</MenuGroup>
						) }
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
										onClick={
											() =>
												!! onClick
													? onClick(
															template.entityForSuggestions
													  )
													: createTemplate( template )
											// We will be navigated way so no need to close the dropdown.
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
					missingPostTypeTemplates={ missingPostTypeTemplates }
				/>
			) }
		</>
	);
}
