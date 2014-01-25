
@Grab(group="org.json", module="json", version="20131018")
import org.json.XML

@Grab(group="com.jiminger", module="lib-image", version="1.0-SNAPSHOT")
import com.jiminger.image.*;
import java.awt.image.BufferedImage;

import groovy.xml.XmlUtil

void usage()
{
   println 'usage: groovy parse exportdir outputdir'
   println '  exportdir: is the directory where you had xbmc export the db. It must exist.'
   println '  outputdir: is a directory where you want the parse results. It must exist.'
   System.exit(1)
}

if (args.length != 2) usage();

File inDir = new File(args[0])
File outDir = new File(args[1])

if (!inDir.exists() || !inDir.isDirectory()) usage();
if (!outDir.exists() || !outDir.isDirectory()) usage();

File videodbxml = new File(inDir,"videodb.xml")
File movieImageDir = new File(inDir, "movies")
File tvshowImageDir = new File(inDir, "tvshows")

File imageDir = new File(outDir,"images")
if (!imageDir.exists())
   imageDir.mkdirs();

File detailsDir = new File(outDir,"details")
if (!detailsDir.exists())
   detailsDir.mkdirs();

Node doc = new XmlParser().parse(videodbxml)

Node movieDoc = new Node(null, 'video')
Node tvDoc = new Node(null, 'video')

copy = { File src,File dest->

   println "copying " + src + " -> " + dest
   def input = src.newDataInputStream()
   def output = dest.newDataOutputStream()

   output << input

   input.close()
   output.close()
}

String sanitize( String src) { return src.replace("\"", "\\\"").replaceAll("[\\r\\n]", " ").replace("\\'", "'"); }

List listify(Object o) { return o instanceof List ? (List)o : [o]; }

void transcode(File source, File dest)
{
   ImageFile.ImageDestinationDefinition destDef = new ImageFile.ImageDestinationDefinition();
   destDef.outfile = dest.absolutePath
   destDef.maxh = 100;
   BufferedImage image = ImageFile.readImageFile(source.absolutePath)
   ImageFile.transcode(image, destDef)
}

movieMap = [:]
int idseq = 0
for (Node n : doc.movie)
{
   String id = "M${idseq++}"
   String title = n.title.text()
   String year = n.year.text()
   movieMap[id] = n
   Node m = new Node(movieDoc,'movie', [ 'id': id, 'year' : year ])
   new Node(m,'title',  title)
   // copy the thumbnail over.
   String imgFnameBase = title.replace(' ',  '_').replace('?', '_') + '_' + year;
   File srcimg = new File(movieImageDir, imgFnameBase + "-poster.jpg")
   if (!srcimg.exists()) // maybe there's a thumb instead
      srcimg = new File(movieImageDir, imgFnameBase + "-thumb.jpg")
   if (srcimg.exists())
   {
      copy(srcimg,new File(imageDir,"${id}-poster.jpg"))
      ImageFile.ImageDestinationDefinition dest = new ImageFile.ImageDestinationDefinition();
      dest.outfile = new File(imageDir,"${id}-thumb.jpg").absolutePath
      dest.maxh = 100;
      BufferedImage image = ImageFile.readImageFile(srcimg.absolutePath)
      ImageFile.transcode(image, dest)
   }
   // copy the fanart
   srcimg = new File(movieImageDir, imgFnameBase + "-fanart.jpg")
   if (srcimg.exists())
      copy(srcimg,new File(imageDir,"${id}-bg.jpg"))
   // create a json snippet with the details.
   File detailsFile = new File(detailsDir,"${id}.json")
   detailsFile.write("{ \"filenameandpath\": \"${sanitize(n.filenameandpath.text())}\", \"plot\": \"${sanitize(n.plot.text())}\" }")
}
File outMovieXml = new File(outDir,"movies.json")
outMovieXml.write(XML.toJSONObject(XmlUtil.serialize(movieDoc)).toString())

tvMap = [:]
idseq = 0
for (Node n : doc.tvshow)
{
   String id = "T${idseq++}"
   String title = n.title.text()
   tvMap[id] = n
   Node m = new Node(tvDoc,'tvshow', [ 'id': id ])
   new Node(m,'title',  title)

   String imgDirNameBase = title.replace(' ',  '_').replace('?', '_');
   File imgDir = new File(tvshowImageDir,imgDirNameBase)
   if (imgDir.exists())
   {
      // see if the poster exists
      File poster = new File(imgDir,"poster.jpg")
      if (poster.exists())
      {
         copy(poster,new File(imageDir,"${id}-poster.jpg"))
         transcode(poster,new File(imageDir,"${id}-thumb.jpg"))
      }

      File fanart = new File(imgDir,"fanart.jpg")
      if (fanart.exists())
         copy(fanart,new File(imageDir,"${id}-bg.jpg"))
   }

   // create a json snippet with the details.
   File detailsFile = new File(detailsDir,"${id}.json")
   String details = "{ \"plot\": \"${sanitize(n.plot.text())}\", "

   details += ' "episodes" : ['
   List eps = listify(n.episodedetails)
   int numeps = eps.size()
   eps.eachWithIndex { it, index ->
      details += "{ \"title\": \"${sanitize(it.title.text())}\", " + 
            "\"id\": \"T${id}-E${index}\", " +
            "\"plot\": \"${sanitize(it.plot.text())}\", " + 
            "\"season\" : ${it.season.text()}, " +
            "\"episode\" : ${it.episode.text()}, " + 
            "\"filenameandpath\" : \"${it.filenameandpath.text()}\" }${ index != numeps - 1 ? ',' : ''} "};

   details += ']'

   details += "}"
   detailsFile.write(details)
}

File outTvXml = new File(outDir,"tvshows.json")
outTvXml.write(XML.toJSONObject(XmlUtil.serialize(tvDoc)).toString())
