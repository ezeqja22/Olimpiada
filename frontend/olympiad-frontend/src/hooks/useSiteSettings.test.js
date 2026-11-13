import { expect, test, vi } from 'vitest';
import axios from 'axios';
import { readSiteSettings } from './useSiteSettings';
vi.mock('axios', () => ({default:{get:vi.fn()}}));
test('concurrent CMS reads share a request; later reads fetch fresh values', async () => {
 let resolve;
 axios.get.mockReturnValueOnce(new Promise(r => {resolve=r;}));
 const a=readSiteSettings(), b=readSiteSettings();
 expect(a).toBe(b); expect(axios.get).toHaveBeenCalledTimes(1);
 resolve({data:{site_name:'Current'}}); await a;
 axios.get.mockResolvedValueOnce({data:{site_name:'Updated'}});
 expect((await readSiteSettings()).data.site_name).toBe('Updated');
 expect(axios.get).toHaveBeenCalledTimes(2);
});
test('a rejected read does not prevent retry', async () => {
 axios.get.mockRejectedValueOnce(new Error('offline'));
 await expect(readSiteSettings()).rejects.toThrow('offline');
 axios.get.mockResolvedValueOnce({data:{}});
 await expect(readSiteSettings()).resolves.toEqual({data:{}});
});
