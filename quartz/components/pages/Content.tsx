import { htmlToJsx } from "../../util/jsx"
import Comments from "../Comments"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const Content: QuartzComponent = ({ fileData, tree }: QuartzComponentProps) => {
  const content = htmlToJsx(fileData.filePath!, tree)
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")
  return (
    <>
      <article class={classString}>{content}</article>
      <Comments />
    </>
  )
}

export default (() => Content) satisfies QuartzComponentConstructor
