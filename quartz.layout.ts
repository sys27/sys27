import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { isFolderPath } from "./quartz/util/path";

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    Component.Comments({
      provider: 'giscus',
      options: {
        repo: 'sys27/sys27',
        repoId: 'R_kgDOLw20Lw',
        category: 'General',
        categoryId: 'DIC_kwDOLw20L84Ce0bA',
        mapping: 'url',
        strict: true,
        reactionsEnabled: true,
        inputPosition: 'bottom',
      }
    }),
  ],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/sys27",
      LinkedIn: "https://www.linkedin.com/in/dmytrokyshchenko/",
      StackOverflow: "https://stackoverflow.com/users/743754/exploding-kitten",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
    Component.DesktopOnly(Component.Explorer()),
  ],
  right: [
    Component.DesktopOnly(Component.TableOfContents()),
    Component.RecentNotes({
      title: "Recent Notes",
      limit: 5,
      filter: data => !isFolderPath(data.slug ?? ""),
    }),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
    Component.DesktopOnly(Component.Explorer()),
  ],
  right: [],
}
