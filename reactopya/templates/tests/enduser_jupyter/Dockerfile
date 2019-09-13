FROM ubuntu:18.04

#########################################
### Python                                                               
RUN apt-get update && apt-get -y install git wget build-essential
RUN apt-get install -y python3 python3-pip
RUN ln -s python3 /usr/bin/python
RUN ln -s pip3 /usr/bin/pip
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y python3-tk

#########################################
### Node and yarn
RUN apt-get update && apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - && apt-get update && apt-get install -y nodejs
RUN npm install -g yarn

#########################################
### opengl
RUN apt-get update && apt-get install -y libgl1-mesa-glx

#########################################
### Numpy
RUN pip install numpy

#########################################
### JupyterLab
RUN pip install jupyterlab

#########################################
### Install reactopya_jup
RUN jupyter labextension install @jupyter-widgets/jupyterlab-manager
RUN pip install --upgrade reactopya_jup==0.7.0
RUN jupyter labextension install reactopya_jup@0.7.0
RUN pip install ipywidgets
RUN jupyter nbextension install --sys-prefix --py reactopya_jup
RUN jupyter nbextension enable reactopya_jup --py --sys-prefix

#########################################
### Install {{ project_name }}
RUN pip install {{ project_name }}=={{ version }}

CMD echo "See instructions.txt on how to run this container"
