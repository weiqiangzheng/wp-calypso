/** @format */

/**
 * External dependencies
 */

import debugFactory from 'debug';
import update from 'immutability-helper';
import { sortBy } from 'lodash';

/**
 * Internal dependencies
 */
import {
	DOMAIN_TRANSFER_CODE_REQUEST_COMPLETED,
	DOMAINS_FETCH,
	DOMAINS_FETCH_COMPLETED,
	DOMAINS_FETCH_FAILED,
	DOMAINS_INITIALIZE,
	PRIMARY_DOMAIN_SET,
	PRIMARY_DOMAIN_SET_COMPLETED,
	PRIMARY_DOMAIN_SET_FAILED,
	PRIVACY_PROTECTION_ENABLE_COMPLETED,
} from 'lib/upgrades/action-types';
import { getSelectedDomain, isInitialized } from './';

const debug = debugFactory( 'calypso:lib:domains:store' );

const initialState = {};

function updateSiteState( state, siteId, attributes ) {
	return update( state, {
		[ siteId ]: {
			$apply: value => Object.assign( {}, value, attributes ),
		},
	} );
}

function updateDomainState( state, siteId, domainName, attributes ) {
	return update( state, {
		[ siteId ]: {
			list: {
				$apply: domains =>
					domains.map( domain => {
						if ( domain.name !== domainName ) {
							return domain;
						}

						return Object.assign( {}, domain, attributes );
					} ),
			},
		},
	} );
}

function reducer( state, payload ) {
	let { action } = payload,
		{ type, siteId } = action,
		domainData,
		privateDomain;

	switch ( type ) {
		case DOMAINS_INITIALIZE:
			if ( isInitialized( state, siteId ) ) {
				return state;
			}

			return updateSiteState( state, siteId, {
				isFetching: false,
				hasLoadedFromServer: false,
				list: null,
			} );

		case DOMAINS_FETCH:
			return updateSiteState( state, siteId, {
				isFetching: true,
			} );

		case DOMAINS_FETCH_COMPLETED:
			return updateSiteState( state, siteId, {
				isFetching: false,
				hasLoadedFromServer: true,
				list: action.domains,
				settingPrimaryDomain: false,
			} );

		case DOMAINS_FETCH_FAILED:
			debug( action.error );

			return updateSiteState( state, siteId, {
				isFetching: false,
			} );

		case PRIMARY_DOMAIN_SET:
			return updateSiteState( state, siteId, {
				settingPrimaryDomain: true,
			} );

		case PRIMARY_DOMAIN_SET_COMPLETED:
			return updateSiteState( state, siteId, {
				settingPrimaryDomain: false,
				list: sortBy(
					getBySite( state, siteId ).list.map( domain => {
						return Object.assign( {}, domain, { isPrimary: domain.name === action.domainName } );
					} ),
					domain => ! domain.isPrimary
				),
			} );

		case PRIMARY_DOMAIN_SET_FAILED:
			return updateSiteState( state, siteId, {
				settingPrimaryDomain: false,
			} );

		case PRIVACY_PROTECTION_ENABLE_COMPLETED:
			return updateDomainState( state, action.siteId, action.domainName, {
				privateDomain: true,
			} );

		case DOMAIN_TRANSFER_CODE_REQUEST_COMPLETED:
			domainData = getSelectedDomain( {
				domains: getBySite( state, action.siteId ),
				selectedDomainName: action.domainName,
			} );
			privateDomain = ! action.disablePrivacy && domainData.privateDomain;

			return updateDomainState( state, action.siteId, action.domainName, {
				privateDomain,
			} );

		default:
			return state;
	}
}

function getBySite( state, siteId ) {
	return state[ siteId ];
}

export { getBySite, initialState, reducer };
