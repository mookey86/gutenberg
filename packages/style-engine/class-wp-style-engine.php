<?php
/**
 * WP_Style_Engine
 *
 * Generates classnames and block styles.
 *
 * @package Gutenberg
 */

if ( class_exists( 'WP_Style_Engine' ) ) {
	return;
}

/**
 * Singleton class representing the style engine.
 *
 * Consolidates rendering block styles to reduce duplication and streamline
 * CSS styles generation.
 *
 * This class is for internal core usage and is not supposed to be used by extenders (plugins and/or themes).
 * This is a low-level API that may need to do breaking changes. Please, use gutenberg_style_engine_get_styles instead.
 *
 * @access private
 */
class WP_Style_Engine {
	/**
	 * Container for the main instance of the class.
	 *
	 * @var WP_Style_Engine|null
	 */
	private static $instance = null;

	/**
	 * Style definitions that contain the instructions to
	 * parse/output valid Gutenberg styles from a block's attributes.
	 * For every style definition, the follow properties are valid:
	 *  - classnames   => an array of classnames to be returned for block styles. The key is a classname or pattern.
	 *                    A value of `true` means the classname should be applied always. Otherwise a valid CSS property
	 *                    to match the incoming value, e.g., "color" to match var:preset|color|somePresetName.
	 *  - properties   => an array of `key => value` pairs that represents valid CSS properties for the style, e.g., "margin" or "border".
	 *                    A 'default' property, corresponding to a single or shorthand value, is required.
	 *  - path         => a path that accesses the corresponding style value in the block style object.
	 *  - value_func   => a function to generate an array of valid CSS rules for a particular style object.
	 *                    For example, `'padding' => 'array( 'top' => '1em' )` will return `array( 'padding-top' => '1em' )`
	 */
	const BLOCK_STYLE_DEFINITIONS_METADATA = array(
		'color'      => array(
			'text'       => array(
				'properties' => array(
					'default' => 'color',
				),
				'path'       => array( 'color', 'text' ),
				'classnames' => array(
					'has-text-color'  => true,
					'has-$slug-color' => 'color',
				),
			),
			'background' => array(
				'properties' => array(
					'default' => 'background-color',
				),
				'path'       => array( 'color', 'background' ),
				'classnames' => array(
					'has-background'             => true,
					'has-$slug-background-color' => 'color',
				),
			),
			'gradient'   => array(
				'properties' => array(
					'default' => 'background',
				),
				'path'       => array( 'color', 'gradient' ),
				'classnames' => array(
					'has-background'                => true,
					'has-$slug-gradient-background' => 'gradient',
				),
			),
		),
		'border'     => array(
			'color'  => array(
				'properties' => array(
					'default' => 'border-color',
					'sides'   => 'border-$side-color',
				),
				'path'       => array( 'border', 'color' ),
				'classnames' => array(
					'has-border-color'       => true,
					'has-$slug-border-color' => 'color',
				),
			),
			'radius' => array(
				'properties' => array(
					'default' => 'border-radius',
					'sides'   => 'border-$side-radius',
				),
				'path'       => array( 'border', 'radius' ),
			),
			'style'  => array(
				'properties' => array(
					'default' => 'border-style',
					'sides'   => 'border-$side-style',
				),
				'path'       => array( 'border', 'style' ),
			),
			'width'  => array(
				'properties' => array(
					'default' => 'border-width',
					'sides'   => 'border-$side-width',
				),
				'path'       => array( 'border', 'width' ),
			),
			'top'    => array(
				'value_func' => 'static::get_css_side_rules',
				'path'       => array( 'border', 'top' ),
				'css_vars'   => array(
					'color' => '--wp--preset--color--$slug',
				),
			),
			'right'  => array(
				'value_func' => 'static::get_css_side_rules',
				'path'       => array( 'border', 'right' ),
				'css_vars'   => array(
					'color' => '--wp--preset--color--$slug',
				),
			),
			'bottom' => array(
				'value_func' => 'static::get_css_side_rules',
				'path'       => array( 'border', 'bottom' ),
				'css_vars'   => array(
					'color' => '--wp--preset--color--$slug',
				),
			),
			'left'   => array(
				'value_func' => 'static::get_css_side_rules',
				'path'       => array( 'border', 'left' ),
				'css_vars'   => array(
					'color' => '--wp--preset--color--$slug',
				),
			),
		),
		'spacing'    => array(
			'padding' => array(
				'properties' => array(
					'default' => 'padding',
					'sides'   => 'padding-$side',
				),
				'path'       => array( 'spacing', 'padding' ),
			),
			'margin'  => array(
				'properties' => array(
					'default' => 'margin',
					'sides'   => 'margin-$side',
				),
				'path'       => array( 'spacing', 'margin' ),
			),
		),
		'typography' => array(
			'fontSize'       => array(
				'properties' => array(
					'default' => 'font-size',
				),
				'path'       => array( 'typography', 'fontSize' ),
				'classnames' => array(
					'has-$slug-font-size' => 'font-size',
				),
			),
			'fontFamily'     => array(
				'properties' => array(
					'default' => 'font-family',
				),
				'path'       => array( 'typography', 'fontFamily' ),
				'classnames' => array(
					'has-$slug-font-family' => 'font-family',
				),
			),
			'fontStyle'      => array(
				'properties' => array(
					'default' => 'font-style',
				),
				'path'       => array( 'typography', 'fontStyle' ),
			),
			'fontWeight'     => array(
				'properties' => array(
					'default' => 'font-weight',
				),
				'path'       => array( 'typography', 'fontWeight' ),
			),
			'lineHeight'     => array(
				'properties' => array(
					'default' => 'line-height',
				),
				'path'       => array( 'typography', 'lineHeight' ),
			),
			'textDecoration' => array(
				'properties' => array(
					'default' => 'text-decoration',
				),
				'path'       => array( 'typography', 'textDecoration' ),
			),
			'textTransform'  => array(
				'properties' => array(
					'default' => 'text-transform',
				),
				'path'       => array( 'typography', 'textTransform' ),
			),
			'letterSpacing'  => array(
				'properties' => array(
					'default' => 'letter-spacing',
				),
				'path'       => array( 'typography', 'letterSpacing' ),
			),
		),
	);

	/**
	 * Utility method to retrieve the main instance of the class.
	 *
	 * The instance will be created if it does not exist yet.
	 *
	 * @return WP_Style_Engine The main instance.
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Extracts the slug in kebab case from a preset string, e.g., "heavenly-blue" from 'var:preset|color|heavenlyBlue'.
	 *
	 * @param string $style_value  A single css preset value.
	 * @param string $property_key The CSS property that is the second element of the preset string. Used for matching.
	 *
	 * @return string|null The slug, or null if not found.
	 */
	protected static function get_slug_from_preset_value( $style_value, $property_key ) {
		if ( is_string( $style_value ) && strpos( $style_value, "var:preset|{$property_key}|" ) !== false ) {
			$index_to_splice = strrpos( $style_value, '|' ) + 1;
			return _wp_to_kebab_case( substr( $style_value, $index_to_splice ) );
		}
		return null;
	}

	/**
	 * Returns classnames, and generates classname(s) from a CSS preset property pattern, e.g., 'var:preset|color|heavenly-blue'.
	 *
	 * @param array         $style_value      A single raw style value or css preset property from the generate() $block_styles array.
	 * @param array<string> $style_definition A single style definition from BLOCK_STYLE_DEFINITIONS_METADATA.
	 *
	 * @return array        An array of CSS classnames.
	 */
	protected static function get_classnames( $style_value, $style_definition ) {
		$classnames = array();
		if ( ! empty( $style_definition['classnames'] ) ) {
			foreach ( $style_definition['classnames'] as $classname => $property_key ) {
				if ( true === $property_key ) {
					$classnames[] = $classname;
				}

				$slug = static::get_slug_from_preset_value( $style_value, $property_key );

				if ( $slug ) {
					// Right now we expect a classname pattern to be stored in BLOCK_STYLE_DEFINITIONS_METADATA.
					// One day, if there are no stored schemata, we could allow custom patterns or
					// generate classnames based on other properties
					// such as a path or a value or a prefix passed in options.
					$classnames[] = strtr( $classname, array( '$slug' => $slug ) );
				}
			}
		}

		return $classnames;
	}

	/**
	 * Returns CSS rules based on valid block style values.
	 *
	 * @param array         $style_value      A single raw style value from the generate() $block_styles array.
	 * @param array<string> $style_definition A single style definition from BLOCK_STYLE_DEFINITIONS_METADATA.
	 *
	 * @return array        An array of CSS rules.
	 */
	protected static function get_css( $style_value, $style_definition ) {
		$css = array();

		if (
			isset( $style_definition['value_func'] ) &&
			is_callable( $style_definition['value_func'] )
		) {
			return call_user_func( $style_definition['value_func'], $style_value, $style_definition );
		}

		// Low-specificity check to see if the value is a CSS preset.
		if ( is_string( $style_value ) && strpos( $style_value, 'var:' ) !== false ) {
			return $css;
		}

		return static::get_css_rules( $style_value, $style_definition );
	}

	/**
	 * Returns an CSS ruleset.
	 * Styles are bundled based on the instructions in BLOCK_STYLE_DEFINITIONS_METADATA.
	 *
	 * @param array $block_styles An array of styles from a block's attributes.
	 *
	 * @return array|null array(
	 *     'styles'     => (string) A CSS ruleset formatted to be placed in an HTML `style` attribute or tag.
	 *     'classnames' => (string) Classnames separated by a space.
	 * );
	 */
	public function generate( $block_styles ) {
		if ( empty( $block_styles ) || ! is_array( $block_styles ) ) {
			return null;
		}

		$css_rules     = array();
		$classnames    = array();
		$styles_output = array();

		// Collect CSS and classnames.
		foreach ( self::BLOCK_STYLE_DEFINITIONS_METADATA as $definition_group_key => $definition_group_style ) {
			if ( empty( $block_styles[ $definition_group_key ] ) ) {
				continue;
			}
			foreach ( $definition_group_style as $style_definition ) {
				$style_value = _wp_array_get( $block_styles, $style_definition['path'], null );

				if ( empty( $style_value ) ) {
					continue;
				}

				$classnames = array_merge( $classnames, static::get_classnames( $style_value, $style_definition ) );
				$css_rules  = array_merge( $css_rules, static::get_css( $style_value, $style_definition ) );
			}
		}

		// Build CSS rules output.
		$css_output = '';
		if ( ! empty( $css_rules ) ) {
			// Generate inline style rules.
			// In the future there might be a flag in the option to output
			// inline CSS rules (for HTML style attributes) vs selectors + rules for style tags.
			foreach ( $css_rules as $rule => $value ) {
				$filtered_css = esc_html( safecss_filter_attr( "{$rule}: {$value}" ) );
				if ( ! empty( $filtered_css ) ) {
					$css_output .= $filtered_css . '; ';
				}
			}
		}

		if ( ! empty( $css_output ) ) {
			$styles_output['css'] = trim( $css_output );
		}

		if ( ! empty( $classnames ) ) {
			$styles_output['classnames'] = implode( ' ', array_unique( $classnames ) );
		}

		return $styles_output;
	}

	/**
	 * Default style value parser that returns a CSS ruleset.
	 * If the input contains an array, it will be treated like a box model
	 * for styles such as margins and padding.
	 *
	 * @param string|array $style_value      A single raw Gutenberg style attributes value for a CSS property.
	 * @param array        $style_definition A single style definition from BLOCK_STYLE_DEFINITIONS_METADATA.
	 *
	 * @return array The class name for the added style.
	 */
	protected static function get_css_rules( $style_value, $style_definition ) {
		$rules = array();

		if ( ! $style_value ) {
			return $rules;
		}

		$style_properties = $style_definition['properties'];

		// We assume box model-like properties.
		if ( is_array( $style_value ) ) {
			foreach ( $style_value as $key => $value ) {
				$side_property           = strtr( $style_properties['sides'], array( '$side' => _wp_to_kebab_case( $key ) ) );
				$rules[ $side_property ] = $value;
			}
		} else {
			$rules[ $style_properties['default'] ] = $style_value;
		}

		return $rules;
	}

	/**
	 * Style value parser that returns a CSS ruleset for style groups that have 'top', 'right', 'bottom', 'left' keys.
	 * E.g., `border.top{color|width|style}.
	 *
	 * @param array $style_value      A single raw Gutenberg style attributes value for a CSS property.
	 * @param array $style_definition A single style definition from BLOCK_STYLE_DEFINITIONS_METADATA.
	 *
	 * @return array The class name for the added style.
	 */
	protected static function get_css_side_rules( $style_value, $style_definition ) {
		$rules = array();

		if ( ! is_array( $style_value ) || empty( $style_value ) ) {
			return $rules;
		}

		foreach ( $style_value as $css_property => $value ) {
			if ( empty( $value ) ) {
				continue;
			}
			// The first item in the style definition path array tells us the style property, e.g., "border".
			// We use this to get a corresponding CSS style definition such as "color" or "width" from the same group.
			$side_style_definition_path = array( $style_definition['path'][0], $css_property );
			$side_style_definition      = _wp_array_get( self::BLOCK_STYLE_DEFINITIONS_METADATA, $side_style_definition_path, null );

			if ( $side_style_definition && isset( $side_style_definition['properties']['sides'] ) ) {
				// Set a CSS var if there is a valid preset value.
				$slug = isset( $style_definition['css_vars'][ $css_property ] ) ? static::get_slug_from_preset_value( $value, $css_property ) : null;
				if ( $slug ) {
					$css_var = strtr(
						$style_definition['css_vars'][ $css_property ],
						array( '$slug' => $slug )
					);
					$value   = "var($css_var)";
				}
				// The second item in the style definition path array refers to the side property, e.g., "top".
				$side_css_property           = strtr( $side_style_definition['properties']['sides'], array( '$side' => $style_definition['path'][1] ) );
				$rules[ $side_css_property ] = $value;
			}
		}
		return $rules;
	}
}

/**
 * Global public interface method to WP_Style_Engine->generate.
 *
 * Returns an CSS ruleset.
 * Styles are bundled based on the instructions in BLOCK_STYLE_DEFINITIONS_METADATA.
 *
 * @param array $block_styles An array of styles from a block's attributes.
 *
 * @return array|null array(
 *     'styles'     => (string) A CSS ruleset formatted to be placed in an HTML `style` attribute or tag.
 *     'classnames' => (string) Classnames separated by a space.
 * );
 */
function wp_style_engine_generate( $block_styles ) {
	if ( class_exists( 'WP_Style_Engine' ) ) {
		$style_engine = WP_Style_Engine::get_instance();
		return $style_engine->generate( $block_styles );
	}
	return null;
}
