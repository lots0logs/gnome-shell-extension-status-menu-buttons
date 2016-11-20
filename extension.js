/*
 * extension.js
 *
 * Copyright © 2016 Antergos <dev@antergos.com>
 * Copyright © 2014-2015 Alexandre Relange
 *
 * This file is part of gnome-shell-extension-status-menu-buttons, (GSE-SMB).
 *
 * GSE-SMB is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * GSE-SMB is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * The following additional terms are in effect as per Section 7 of the license:
 *
 * The preservation of all legal notices and author attributions in
 * the material or in the Appropriate Legal Notices displayed
 * by works containing it is required.
 *
 * You should have received a copy of the GNU General Public License
 * along with GSE-SMB; If not, see <http://www.gnu.org/licenses/>.
 */

const BoxPointer = imports.ui.boxpointer;
const GObject    = imports.gi.GObject;
const Lang       = imports.lang;
const Main       = imports.ui.main;
const MainLoop   = imports.mainloop;
const Util       = imports.misc.util;

const ThisModule    = imports.misc.extensionUtils.getCurrentExtension();
const ConfirmDialog = ThisModule.imports.confirmDialog;
const __canLock = Main.LoginManager.canLock;

let _self = null,
	system = null;

Main.LoginManager.canLock = _canLock;

const StatusMenuButtons = new Lang.Class( {
	Name: 'StatusMenuButtons',

	__updateActionsVisibility: null,
	__updateLockScreen: null,

	_maybeReverseArray: function( undo, callbacks ) {
		return undo ? callbacks.reverse() : callbacks
	},

	_mpLockScreen: function( undo ) {
		let theirCallback, ourCallback, oldCallback, newCallback;

		undo = ( 'undefined' !== typeof undo && 'undo' === undo );

		theirCallback = Lang.bind( system, system._onLockScreenClicked );
		ourCallback   = Lang.bind( this, this.onLockScreenClicked );

		[oldCallback, newCallback] = this._maybeReverseArray( undo, [theirCallback, ourCallback] );

		this._replace_signal_handler( system._lockScreenAction, 'clicked', oldCallback, newCallback, 'all' );

		system._updateLockScreen  = undo ? this.__updateLockScreen : () => this._updateLockScreen();

		system._updateLockScreen();
	},

	_mpExtraSuspendButton: function( undo ) {
		undo = ( 'undefined' !== typeof undo && 'undo' === undo );

		if ( undo ) {
			system._orientationSettings.disconnect( this._orientationSignal );
			Main.layoutManager.disconnect( this._monitorsSignal );
			this.onOrientationChange( 'remove_extra_button' );
		
		} else {
			let callback = Lang.bind( this, this.onOrientationChange );

			this._orientationSignal = system._orientationSettings.connect( 'changed::orientation-lock', callback );
			this._monitorsSignal = Main.layoutManager.connect( 'monitors-changed', callback );

			this.onOrientationChange();
		}
	},

	_replace_signal_handler: function( obj, signalName, oldCallback, newCallback, all ) {
		all = ( 'undefined' !== typeof all && 'all' === all );

		if ( '_signalConnections' in obj ) {
			// The object is using GJS Signals system.
			for ( let connection of obj._signalConnections ) {
				let callbacks_equal = connection.callback.toString() == oldCallback.toString(),
					disconnect = ( all && connection.name === signalName ) || callbacks_equal;

				if ( disconnect ) {
					obj.disconnect( connection.id );
				}
			}

		} else {
			// The object is using GObject Signals system.
			// This will only work if oldCallback is the exact same reference that
			// was passed when connecting the handler.
			let mask = all ? GObject.SignalMatchType.ID : GObject.SignalMatchType.CLOSURE,
				handlerID;

			if ( all ) {
				let ID = GObject.signal_lookup( signalName, obj );
				handlerID = GObject.signal_handler_find( obj, mask, ID, null, null, null, null );
			} else {
				handlerID = GObject.signal_handler_find( obj, mask, null, null, oldCallback, null, null );
			}

			if ( 0 === handlerID ) {
				// log('Signal handler not found for ' + signalName + ' on ' + obj.toString() );
				return;
			}

			GObject.signal_handler_disconnect( obj, handlerID );
		}

		return obj.connect( signalName, newCallback );
	},

	_updateLockScreen: function() {
		let showLock        = !( Main.sessionMode.isLocked || Main.sessionMode.isGreeter );
		let allowLockScreen = !system._lockdownSettings.get_boolean( 'disable-lock-screen' );

		system._lockScreenAction.visible = ( showLock && allowLockScreen );

		this.__updateActionsVisibility();
	},

	onOrientationChange: function( remove ) {
		remove = ( 'undefined' !== typeof remove && 'remove_extra_button' === remove );

		if ( this._suspendButtonAdded && ( system._orientationLockAction.visible || remove ) ) {
			this._suspendButtonAdded = false;

			this._suspendAction.disconnect( this._suspendActionSignal );
			system._actionsItem.actor.remove_child( this._suspendAction );
			this.__updateActionsVisibility();

		} else if ( ! system._orientationLockAction.visible && ! this._suspendButtonAdded ) {
			this._suspendButtonAdded = true;

			this._suspendAction = system._createActionButton( 'media-playback-pause-symbolic', _("Suspend") );
			this._suspendActionSignal = this._suspendAction.connect( 'clicked', Lang.bind( system, system._onSuspendClicked ) );

			let aggregateButton = system._actionsItem.actor.get_last_child();

			system._actionsItem.actor.insert_child_at_index( this._suspendAction, -1 );
			system._actionsItem.actor.set_child_at_index( aggregateButton, -1 );
			this.__updateActionsVisibility();
		}
	},

	enable: function() {
		this._suspendButtonAdded = false;

		MainLoop.timeout_add( 2000, () => {
			this._mpLockScreen();
			this._mpExtraSuspendButton();
			this.__updateActionsVisibility();
		} );
	},

	init: function() {
		this.__updateActionsVisibility = Lang.bind( system, system._updateActionsVisibility );
		this.__updateLockScreen = Lang.bind( system, system._updateLockScreen );
	},

	disable: function() {
		this._mpLockScreen( 'undo' );
		this._mpExtraSuspendButton( 'undo' );
		this.__updateActionsVisibility();
	},

	onLockScreenClicked: function() {
		log('fired!!!');
		system.menu.itemActivated( BoxPointer.PopupAnimation.NONE );
		Util.spawn( ['/usr/bin/light-locker-command', '-l'] );
	}
} );


function _canLock() {
	if ( null !== _self && _self.is_enabled ) {
		return true;
	}

	return Lang.bind( Main.LoginManager, __canLock )();
}

function init( metadata ) {
	system = Main.panel.statusArea.aggregateMenu._system;
	_self = new StatusMenuButtons();

	_self.init();
}

function enable() {
	_self.enable();
}

function disable() {
	_self.disable();
}
