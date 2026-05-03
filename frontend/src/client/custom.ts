import type { CancelablePromise } from './core/CancelablePromise';
import { OpenAPI } from './core/OpenAPI';
import { request as __request } from './core/request';

export type ContactGeoPoint = {
    contact_id: string;
    contact_name: string;
    avatar_url?: (string | null);
    latitude: number;
    longitude: number;
    address_label: string;
    city?: (string | null);
    country?: (string | null);
    street?: (string | null);
};

export type ContactsGeoResponse = {
    points: Array<ContactGeoPoint>;
    count: number;
};

export type ContactsListContactsGeoData = {
    minLat?: (number | null);
    maxLat?: (number | null);
    minLng?: (number | null);
    maxLng?: (number | null);
};

export class CustomContactsService {
    public static listContactsGeo(data: ContactsListContactsGeoData = {}): CancelablePromise<ContactsGeoResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/contacts/geo',
            query: {
                min_lat: data.minLat,
                max_lat: data.maxLat,
                min_lng: data.minLng,
                max_lng: data.maxLng,
            },
            errors: {
                422: 'Validation Error',
            },
        });
    }
}
