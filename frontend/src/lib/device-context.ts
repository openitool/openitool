import { setContext, getContext, onMount } from 'svelte';
import { writable, type Writable } from 'svelte/store';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

import type { Hardware, Battery, OS, Storage, DeviceContextType } from '$lib/types';

const empty_hardware = { model: '', model_number: '', region: '' };
const hardware = writable<Hardware>(empty_hardware);

const empty_battery = { battery_level: 0, battery_health: 0, cycle_counts: 0 };
const battery = writable<Battery>(empty_battery);

const empty_os = { ios_ver: '', build_num: '' };
const os = writable<OS>(empty_os);

const empty_storage = { total_storage: 0, used_storage: 0, available_storage: 0 };
const storage = writable<Storage>(empty_storage);

const connected = writable<boolean>(false);

const deviceContext: DeviceContextType = { hardware, battery, os, storage, connected };

function updateStore<T>(store: Writable<T>, value: any) {
	store.set(value);
}

export function setDeviceContext() {
	setContext('device', deviceContext);
}

export function getDeviceContext(): DeviceContextType {
	return getContext<DeviceContextType>('device');
}

export function startDeviceListeners<T>() {
	onMount(() => {
		const unlistenHardware = listen<Hardware>('device_hardware', (event) =>
			updateStore(hardware, event.payload)
		);
		const unlistenBattery = listen<Battery>('device_battery', (event) =>
			updateStore(battery, event.payload)
		);
		const unlistenOS = listen<OS>('device_os', (event) => updateStore(os, event.payload));
		const unlistenStorage = listen<Storage>('device_storage', (event) =>
			updateStore(storage, event.payload)
		);
		const unlistenConnection = listen<boolean>('device_status', (event) => {
			// if disconnected
			if (event.payload == false) {
				// put back the default values if disconnected
				// probably not needed, but why not
				for (const [ctx, empty_ctx] of [
					[hardware, empty_hardware],
					[battery, empty_battery],
					[os, empty_os],
					[storage, empty_storage]
				]) {
					updateStore(ctx as Writable<T>, empty_ctx);
				}
			}

			updateStore(connected, event.payload);
		});

		// Start the device monitoring process
		invoke('check_device');

		// Cleanup listeners on unmount
		return () => {
			unlistenHardware.then((unlisten) => unlisten());
			unlistenBattery.then((unlisten) => unlisten());
			unlistenOS.then((unlisten) => unlisten());
			unlistenStorage.then((unlisten) => unlisten());
			unlistenConnection.then((unlisten) => unlisten());
		};
	});
}
