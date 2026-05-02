import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useBrowse } from '../hooks/useBrowse';
import { useFolders } from '../hooks/useFolders';
import { formatBytes, formatDate } from '../lib/format';

function splitWildcard(rest: string | undefined): string[] {
  if (!rest) return [];
  return rest.split('/').filter(Boolean);
}

function joinPrefix(parts: string[]): string {
  return parts.length ? parts.join('/') + '/' : '';
}

export function Browse() {
  const params = useParams();
  const id = params.id ?? '';
  const folderID = decodeURIComponent(id);
  const segments = splitWildcard(params['*']);
  const prefix = joinPrefix(segments);

  const folders = useFolders();
  const folder = folders.data?.folders.find((f) => f.id === folderID);

  const browse = useBrowse(folderID, prefix);

  return (
    <div className="space-y-4">
      <Breadcrumbs id={id} folderID={folderID} folderLabel={folder?.label ?? folderID} segments={segments} />
      <Card className="overflow-hidden">
        {browse.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-5 w-5" />
          </div>
        ) : browse.error ? (
          <p className="px-4 py-6 text-sm text-rose-400">
            {browse.error.message}
          </p>
        ) : browse.data?.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400">Empty directory.</p>
        ) : (
          <table className="w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left font-normal">Name</th>
                <th className="px-4 py-2 text-right font-normal">Size</th>
                <th className="px-4 py-2 text-right font-normal">Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {browse.data?.map((entry) => {
                const childPath = `${prefix}${entry.name}`;
                const target =
                  entry.type === 'dir'
                    ? `/folders/${id}/browse/${encodeChildPath(childPath)}/`
                    : `/folders/${id}/file/${encodeChildPath(childPath)}`;
                return (
                  <tr key={entry.name} className="hover:bg-slate-800/50">
                    <td className="px-4 py-2">
                      <Link to={target} className="text-sky-400 hover:underline">
                        <span aria-hidden="true">{entry.type === 'dir' ? '📁 ' : '📄 '}</span>
                        {entry.name}
                        {entry.type === 'dir' ? '/' : ''}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-300">
                      {entry.type === 'file' ? formatBytes(entry.size) : ''}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-400">
                      {entry.type === 'file' ? formatDate(entry.modified) : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function encodeChildPath(p: string): string {
  return p.split('/').map(encodeURIComponent).join('/');
}

function Breadcrumbs({
  id,
  folderID,
  folderLabel,
  segments,
}: {
  id: string;
  folderID: string;
  folderLabel: string;
  segments: string[];
}) {
  const crumbs = [
    { label: folderLabel, to: `/folders/${id}/browse/`, title: folderID },
    ...segments.map((seg, i) => ({
      label: seg,
      to: `/folders/${id}/browse/${segments.slice(0, i + 1).map(encodeURIComponent).join('/')}/`,
      title: seg,
    })),
  ];
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-400">
      <Link to="/folders" className="hover:text-slate-200">All folders</Link>
      <span>›</span>
      {crumbs.map((c, i) => (
        <Fragment key={c.to}>
          {i > 0 && <span>/</span>}
          {i === crumbs.length - 1 ? (
            <span className="text-slate-200" title={c.title}>{c.label}</span>
          ) : (
            <Link to={c.to} className="hover:text-slate-200" title={c.title}>{c.label}</Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
