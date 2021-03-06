/** @format */
/**
 * External dependencies
 */
import React from 'react';
import { localize } from 'i18n-calypso';
import debugModule from 'debug';
import { assign, filter, omit, pick } from 'lodash';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import FormLabel from 'components/forms/form-label';
import FormFieldset from 'components/forms/form-fieldset';
import FormTextInput from 'components/forms/form-text-input';
import FormButton from 'components/forms/form-button';
import FormButtonsBar from 'components/forms/form-buttons-bar';
import analytics from 'lib/analytics';
import { updateUser } from 'lib/users/actions';
import RoleSelect from 'my-sites/people/role-select';
import { getCurrentUser } from 'state/current-user/selectors';

/**
 * Module Variables
 */
const debug = debugModule( 'calypso:my-sites:people:edit-team-member-form' );

class EditUserForm extends React.Component {
	displayName = 'EditUserForm';

	state = this.getStateObject( this.props );

	componentWillReceiveProps( nextProps ) {
		this.setState( this.getStateObject( nextProps ) );
	}

	getRole( roles ) {
		return roles && roles[ 0 ] ? roles[ 0 ] : null;
	}

	getStateObject( props = this.props ) {
		const role = this.getRole( props.roles );
		return assign( omit( props, 'site' ), { roles: role } );
	}

	getChangedSettings() {
		const originalUser = this.getStateObject( this.props.user );
		const changedKeys = filter( this.getAllowedSettingsToChange(), setting => {
			return (
				'undefined' !== typeof originalUser[ setting ] &&
				'undefined' !== typeof this.state[ setting ] &&
				originalUser[ setting ] !== this.state[ setting ]
			);
		} );

		return pick( this.state, changedKeys );
	}

	getAllowedSettingsToChange() {
		const currentUser = this.props.currentUser;
		const allowedSettings = [];

		if ( ! this.state.ID ) {
			return allowedSettings;
		}

		// On WP.com sites, a user should only be able to update role.
		// A user should not be able to update own role.
		if ( this.props.isJetpack ) {
			if ( ! this.state.linked_user_ID || this.state.linked_user_ID !== currentUser.ID ) {
				allowedSettings.push( 'roles' );
			}
			allowedSettings.push( 'first_name' );
			allowedSettings.push( 'last_name' );
			allowedSettings.push( 'name' );
		} else if ( this.state.ID !== currentUser.ID ) {
			allowedSettings.push( 'roles' );
		}

		return allowedSettings;
	}

	hasUnsavedSettings() {
		return Object.keys( this.getChangedSettings() ).length;
	}

	updateUser = event => {
		event.preventDefault();

		const changedSettings = this.getChangedSettings();
		debug( 'Changed settings: ' + JSON.stringify( changedSettings ) );

		this.props.markSaved();

		// Since we store 'roles' in state as a string, but user objects expect
		// roles to be an array, if we've updated the user's role, we need to
		// place the role in an array before updating the user.
		updateUser(
			this.props.siteId,
			this.state.ID,
			changedSettings.roles
				? Object.assign( changedSettings, { roles: [ changedSettings.roles ] } )
				: changedSettings
		);
		analytics.ga.recordEvent( 'People', 'Clicked Save Changes Button on User Edit' );
	};

	recordFieldFocus( fieldId ) {
		return () => {
			analytics.ga.recordEvent( 'People', 'Focused on field on User Edit', 'Field', fieldId );
		};
	}

	handleChange = event => {
		this.setState( {
			[ event.target.name ]: event.target.value,
		} );
	};

	renderField( fieldId ) {
		let returnField = null;
		switch ( fieldId ) {
			case 'roles':
				returnField = (
					<RoleSelect
						id="roles"
						name="roles"
						key="roles"
						siteId={ this.props.siteId }
						value={ this.state.roles }
						onChange={ this.handleChange }
						onFocus={ this.recordFieldFocus( 'roles' ) }
					/>
				);
				break;
			case 'first_name':
				returnField = (
					<FormFieldset key="first_name">
						<FormLabel htmlFor="first_name">
							{ this.props.translate( 'First Name', {
								context: 'Text that is displayed in a label of a form.',
							} ) }
						</FormLabel>
						<FormTextInput
							id="first_name"
							name="first_name"
							defaultValue={ this.state.first_name }
							onChange={ this.handleChange }
							onFocus={ this.recordFieldFocus( 'first_name' ) }
						/>
					</FormFieldset>
				);
				break;
			case 'last_name':
				returnField = (
					<FormFieldset key="last_name">
						<FormLabel htmlFor="last_name">
							{ this.props.translate( 'Last Name', {
								context: 'Text that is displayed in a label of a form.',
							} ) }
						</FormLabel>
						<FormTextInput
							id="last_name"
							name="last_name"
							defaultValue={ this.state.last_name }
							onChange={ this.handleChange }
							onFocus={ this.recordFieldFocus( 'last_name' ) }
						/>
					</FormFieldset>
				);
				break;
			case 'name':
				returnField = (
					<FormFieldset key="name">
						<FormLabel htmlFor="name">
							{ this.props.translate( 'Public Display Name', {
								context: 'Text that is displayed in a label of a form.',
							} ) }
						</FormLabel>
						<FormTextInput
							id="name"
							name="name"
							defaultValue={ this.state.name }
							onChange={ this.handleChange }
							onFocus={ this.recordFieldFocus( 'name' ) }
						/>
					</FormFieldset>
				);
				break;
		}

		return returnField;
	}

	render() {
		let editableFields;
		if ( ! this.state.ID ) {
			return null;
		}

		editableFields = this.getAllowedSettingsToChange();

		if ( ! editableFields.length ) {
			return null;
		}

		editableFields = editableFields.map( fieldId => {
			return this.renderField( fieldId );
		} );

		return (
			<form
				className="edit-team-member-form__form" // eslint-disable-line
				disabled={ this.props.disabled }
				onSubmit={ this.updateUser }
				onChange={ this.props.markChanged }
			>
				{ editableFields }
				<FormButtonsBar>
					<FormButton disabled={ ! this.hasUnsavedSettings() }>
						{ this.props.translate( 'Save changes', {
							context: 'Button label that prompts user to save form',
						} ) }
					</FormButton>
				</FormButtonsBar>
			</form>
		);
	}
}

export default localize(
	connect( state => ( { currentUser: getCurrentUser( state ) } ) )( EditUserForm )
);
