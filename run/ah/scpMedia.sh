#!/bin/sh

#!/bin/sh

IP_ADDR=`wget -q --output-document - http://jiminger.com/ip-arrowhead.txt | tail -1`

if [ "$IP_ADDR" = "" ]; then
    echo "Couldn't retrieve the current IP address for the AH home."
    exit 1
fi

MATCH=`echo "$IP_ADDR" | sed -e "s/[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}//1"`

if [ "$MATCH" != "" ]; then
    echo "The IP Address ($IP_ADDR) retrieved for the AH home doesn't appear to be a valid IP."
    exit 1
fi

#echo "Setting up port-forward to Pivos"
#ssh root@$IP_ADDR 'iptables -t nat -I PREROUTING -p tcp -d $(nvram get wan_ipaddr) --dport 441 -j DNAT --to 172.16.2.12:23; iptables -I FORWARD -p tcp -d 172.16.2.12 --dport 23 -j ACCEPT; sleep 1'
#
#ssh -t root@$IP_ADDR -p 441 'busybox umount /mnt/media'
#ssh -t root@$IP_ADDR -p 441 'busybox mkdir -p /mnt/media'
#ssh -t root@$IP_ADDR -p 441 'busybox mount -o unc=\\\\172.16.4.10\\Public,username=guest,password=guest -t cifs //172.16.4.10/Public /mnt/media'
#ssh -t root@$IP_ADDR -p 441 'busybox cp -r /mnt/sdcard/exports/* /mnt/media/exports'
#
#echo "closing up connection to Pivos ...."
#ssh root@$IP_ADDR 'iptables -t nat -D PREROUTING -p tcp -d $(nvram get wan_ipaddr) --dport 441 -j DNAT --to 172.16.2.12:23; iptables -D FORWARD -p tcp -d 172.16.2.12 --dport 23 -j ACCEPT; sleep 1'

# Set up port-forwarding on port 440 so that we can ssh into Media to issue an scp
echo "Setting up port-forward"
ssh root@$IP_ADDR 'iptables -t nat -I PREROUTING -p tcp -d $(nvram get wan_ipaddr) --dport 440 -j DNAT --to 172.16.2.12:22; iptables -I FORWARD -p tcp -d 172.16.2.12 --dport 22 -j ACCEPT; sleep 1'

# scp the media library to here
echo "Copying this files locally ..."
# run the following from Media to make the tar file.
#ssh -t root@pivos 'tar cf - /mnt/sdcard/exports/xbmc_videodb* | uuencode -m /dev/stdout' > ./xbmc_videodb.tar.uu
#gzip -9 ./xbmc_videodb.tar.uu

#rsync -avzhe "ssh -p440" --size-only --progress root@$IP_ADDR:'/data/data/org.xbmc.xbmc/cache/temp/xbmc_videodb_*/*' ./xbmc_videodb
#scp -P 440 root@$IP_ADDR:/DataVolume/shares/Public/exports/xbmc_videodb* ./
rsync -avzhe "ssh -p440" --size-only --partial --progress root@$IP_ADDR:/DataVolume/shares/Public/exports/xbmc_videodb*/ ./xbmc_videodb/

# ssh into Media and rm the export
#echo "Deleting remote directory ..."
#ssh root@$IP_ADDR -p 440 "rm -rf /DataVolume/shares/Public/xbmc_videodb_*"

# Disable the port-forward
echo "closing up...."
ssh root@$IP_ADDR 'iptables -t nat -D PREROUTING -p tcp -d $(nvram get wan_ipaddr) --dport 440 -j DNAT --to 172.16.2.12:22; iptables -D FORWARD -p tcp -d 172.16.2.12 --dport 22 -j ACCEPT; sleep 1'
